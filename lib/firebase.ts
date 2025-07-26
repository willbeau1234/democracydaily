import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  orderBy,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore'
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from 'uuid'
import { getPerformance } from 'firebase/performance'; 
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

//  web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDKKWP1baA8jgaVFZSyx2pHWMHHBLlHFvs",
  authDomain: "thedailydemocracy-37e55.firebaseapp.com",
  projectId: "thedailydemocracy-37e55",
  storageBucket: "thedailydemocracy-37e55.firebasestorage.app",
  messagingSenderId: "208931717554",
  appId: "1:208931717554:web:18e6f049b2622886d5a4ab",
  measurementId: "G-R1ZJFEYTBZ"
 };

// Initialize FirebaseApp
const firebaseApp = initializeApp(firebaseConfig);

// Initialize the Gemini Developer API backend service
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

// Create a `GenerativeModel` instance with a model that supports your use case
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const storage = getStorage(app)
export const perf = typeof window !== 'undefined' ? getPerformance(app) : null;
export { db }

// EXISTING INTERFACES AND FUNCTIONS
export interface Opinion {
  id: string
  content: string
  publishDate: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export const auth = getAuth(app)
export default app

export async function getTodayOpinion(): Promise<Opinion | null> {
  try {
    const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getTodayOpinion')
    const result = await response.json()
    
    if (result.success && result.opinion) {
      return {
        id: result.opinion.id,
        content: result.opinion.content,
        publishDate: result.opinion.publishAt,
        isActive: result.opinion.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Opinion
    }
    return null
  } catch (error) {
    console.error('Error fetching opinion:', error)
    return null
  }
}

export interface UserResponse {
  id: string
  opinionId: string
  stance: 'agree' | 'disagree'
  reasoning: string
  timestamp: Date
  userId?: string
  userType?: 'authenticated' | 'anonymous'
}

export async function submitResponse(
  opinionId: string, 
  stance: 'agree' | 'disagree', 
  reasoning: string,
  userId?: string
): Promise<boolean> {
  try {
    console.log("🔍 Debug - Auth state:", auth.currentUser ? "LOGGED IN" : "NOT LOGGED IN");
    console.log("🔍 Debug - Current user UID:", auth.currentUser?.uid);
    console.log("🔍 Debug - Current user email:", auth.currentUser?.email);

    // Prepare headers
    const headers: any = {
      'Content-Type': 'application/json',
    };

    // FIXED: Add auth token if user is signed in
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
        console.log("🔑 Sending request with auth token for user:", currentUser.uid);
      } catch (tokenError) {
        console.log("⚠️ Could not get auth token, sending as guest:", tokenError);
      }
    } else {
      console.log("👥 No authenticated user, sending as guest");
    }

    const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/submitResponse', {
      method: 'POST',
      headers, // Now includes Authorization header when available
      body: JSON.stringify({
        opinionId,
        stance,
        reasoning,
       
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Response submitted successfully as ${result.userType} user`);
      return true;
    } else {
      console.error("❌ Error submitting response:", result.error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error submitting response:", error);
    return false;
  }
}

export interface OpinionStats {
  agreeCount: number
  disagreeCount: number
  totalResponses: number
  agreePercentage: number
  disagreePercentage: number
}

export async function getOpinionStats(opinionId: string): Promise<OpinionStats> {
  const responsesRef = collection(db, "responses")
  const q = query(responsesRef, where("opinionId", "==", opinionId))
  const querySnapshot = await getDocs(q)
  
  let agreeCount = 0
  let disagreeCount = 0
  
  querySnapshot.forEach((doc) => {
    const data = doc.data()
    if (data.stance === "agree") {
      agreeCount++
    } else if (data.stance === "disagree") {
      disagreeCount++
    }
  })
  
  const totalResponses = agreeCount + disagreeCount
  const agreePercentage = totalResponses > 0 ? Math.round((agreeCount / totalResponses) * 100) : 0
  
  return {
    agreeCount,
    disagreeCount,
    totalResponses,
    agreePercentage,
    disagreePercentage: 100 - agreePercentage
  }
}

export interface SeparatedReasoning {
  agreeReasons: string[]
  disagreeReasons: string[]
}

export async function getReasoningByStance(opinionId: string): Promise<SeparatedReasoning> {
  try {
    const responsesRef = collection(db, "responses")
    const q = query(responsesRef, where("opinionId", "==", opinionId))
    const querySnapshot = await getDocs(q)
    
    const agreeReasons: string[] = []
    const disagreeReasons: string[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.stance === "agree") {
        agreeReasons.push(data.reasoning)
      } else if (data.stance === "disagree") {
        disagreeReasons.push(data.reasoning)
      }
    })
    
    return {
      agreeReasons,
      disagreeReasons
    }
  } catch (error) {
    console.error("Error getting reasoning by stance:", error)
    return { agreeReasons: [], disagreeReasons: [] }
  }
}

export async function getUserResponse(userId: string, opinionId: string): Promise<UserResponse | null> {
  try {
    const responsesRef = collection(db, "responses")
    const q = query(
      responsesRef, 
      where("userId", "==", userId),
      where("opinionId", "==", opinionId)
    )
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()
      
      return {
        id: userDoc.id,
        opinionId: userData.opinionId,
        stance: userData.stance,
        reasoning: userData.reasoning,
        timestamp: userData.timestamp
      } as UserResponse
    }
    
    return null
  } catch (error) {
    console.error("Error fetching user response:", error)
    return null
  }
}

export interface DIYOpinionData {
  title: string
  content: string
  authorName: string
}

export interface DIYOpinion {
  id: string
  userId: string
  title: string
  content: string
  authorName: string
  photoUrl: string | null
  createdAt: Timestamp
  isPrivate: boolean
  shareableToken: string
  agreeCount: number
  disagreeCount: number
}

export interface DIYVoteData {
  vote: 'agree' | 'disagree'
  comment?: string
}

export interface DIYVote {
  id: string
  opinionId: string
  vote: 'agree' | 'disagree'
  comment: string
  voterFingerprint: string
  userId: string
  createdAt: Timestamp
}

export interface WordCloudItem {
  text: string
  size: number
}

export interface CreateDIYOpinionResult {
  id: string
  shareableLink: string
  shareableToken: string
}

// Generate a unique shareable token
const generateShareableToken = (): string => {
  return uuidv4().replace(/-/g, '').substring(0, 16)
}

// Create user opinion with optional photo
export const createUserOpinion = async (
  userId: string, 
  opinionData: DIYOpinionData, 
  photoFile: File | null = null
): Promise<CreateDIYOpinionResult> => {
  try {
    const opinionId = uuidv4()
    const shareableToken = generateShareableToken()
    
    let photoUrl: string | null = null
    
    // Upload photo if provided
    if (photoFile) {
      const fileExtension = photoFile.name.split('.').pop() || 'jpg'
      const photoRef = ref(storage, `opinions/${opinionId}/photo.${fileExtension}`)
      const snapshot = await uploadBytes(photoRef, photoFile)
      photoUrl = await getDownloadURL(snapshot.ref)
    }
    
    const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/createDIYOpinion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        opinionId,
        userId,
        title: opinionData.title,
        content: opinionData.content,
        authorName: opinionData.authorName,
        photoUrl,
        shareableToken
      }),
    })

    const result = await response.json()
    
    if (result.success) {
      return {
        id: opinionId,
        shareableLink: `${window.location.origin}/opinion?token=${shareableToken}`,
        shareableToken
      }
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Error creating opinion:', error)
    throw error
  }
}

// Get opinion by shareable token
export const getOpinionByToken = async (token: string): Promise<DIYOpinion | null> => {
  try {
    const response = await fetch(`https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getDIYOpinion?token=${token}`)
    const result = await response.json()
    
    if (result.success) {
      return result.opinion as DIYOpinion
    }
    return null
  } catch (error) {
    console.error('Error fetching opinion:', error)
    throw error
  }
}

// Submit a vote on DIY opinion
export const submitVote = async (opinionId: string, voteData: DIYVoteData): Promise<DIYVote> => {
  try {
    const userFingerprint = getUserIdentifier()
    
    const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/submitDIYVote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        opinionId,
        vote: voteData.vote,
        comment: voteData.comment || '',
        voterFingerprint: userFingerprint,
        userId: getOrCreateUserId(),
        timestamp: new Date().toISOString()
      }),
    })

    const result = await response.json()
    
    if (result.success) {
      // Record user participation for streak tracking
      
      return {
        id: uuidv4(),
        opinionId,
        vote: voteData.vote,
        comment: voteData.comment || '',
        voterFingerprint: userFingerprint,
        userId: getOrCreateUserId(),
        createdAt: Timestamp.fromDate(new Date())
      } as DIYVote
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Error submitting vote:', error)
    throw error
  }
}

// Get votes for a DIY opinion
export const getVotesForOpinion = async (opinionId: string): Promise<DIYVote[]> => {
  try {
    console.log('Fetching votes for opinion:', opinionId)
    
    // Try Cloud Function first
    try {
      const response = await fetch(`https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getDIYVotes?opinionId=${opinionId}`)
      const result = await response.json()
      
      if (result.success && result.votes) {
        console.log('Votes from Cloud Function:', result.votes)
        return result.votes as DIYVote[]
      } else {
        console.log('Cloud Function failed or returned no votes:', result)
      }
    } catch (cloudError) {
      console.log('Cloud Function error, falling back to Firestore:', cloudError)
    }
    
    // Fallback to direct Firestore query
    console.log('Falling back to direct Firestore query')
    const q = query(
      collection(db, 'diy_votes'), 
      where('opinionId', '==', opinionId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    const votes = querySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id
      } as DIYVote
    })
    
    console.log('Votes from Firestore:', votes)
    return votes
  } catch (error) {
    console.error('Error fetching votes:', error)
    return []
  }
}

// Generate anonymous voter fingerprint
const getOrCreateVoterFingerprint = (): string => {
  if (typeof window === 'undefined') return ''
  
  let fingerprint = localStorage.getItem('voterFingerprint')
  if (!fingerprint) {
    fingerprint = uuidv4()
    localStorage.setItem('voterFingerprint', fingerprint)
  }
  return fingerprint
}

// Generate anonymous user ID (consistent across all features)
const getOrCreateUserId = (): string => {
  if (typeof window === 'undefined') return ''
  
  let userId = localStorage.getItem('anonUserId')
  if (!userId) {
    userId = uuidv4()
    localStorage.setItem('anonUserId', userId)
  }
  return userId
}

// Get user identifier for any voting system
export const getUserIdentifier = (): string => {
  // Use the same identifier for all voting systems
  return getOrCreateVoterFingerprint()
}

// Check if user has voted on a specific opinion
export const hasUserVoted = (opinionId: string, votes: any[]): boolean => {
  const userFingerprint = getUserIdentifier()
  return votes.some(vote => vote.voterFingerprint === userFingerprint)
}

// Get user's vote on a specific opinion
export const getUserVote = (opinionId: string, votes: any[]): any | null => {
  const userFingerprint = getUserIdentifier()
  return votes.find(vote => vote.voterFingerprint === userFingerprint) || null
}

// Generate word cloud data from vote comments
export const generateWordCloudData = (votes: DIYVote[]): WordCloudItem[] => {
  const allText = votes
    .map(vote => vote.comment)
    .filter(comment => comment && comment.length > 0)
    .join(' ')
    .toLowerCase()
  
  if (!allText) return []
  
  // Simple word frequency calculation
  const words = allText
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3) // Filter out short words
  
  const frequency: Record<string, number> = {}
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1
  })
  
  // Convert to word cloud format
  return Object.entries(frequency)
    .map(([text, size]) => ({ text, size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 50) // Top 50 words
}

// Simple authentication system (optional)
export interface UserProfile {
  id: string
  name: string
  email?: string
  createdAt: Date
  lastActive: Date
}

// Create or get user profile
export const createOrGetUserProfile = async (name: string, email?: string): Promise<UserProfile> => {
  const userId = getOrCreateUserId()
  
  if (typeof window === 'undefined') {
    return {
      id: userId,
      name,
      email,
      createdAt: new Date(),
      lastActive: new Date()
    }
  }
  
  // Store user profile in localStorage for now
  // In a real app, you'd store this in Firestore
  const profile: UserProfile = {
    id: userId,
    name,
    email,
    createdAt: new Date(),
    lastActive: new Date()
  }
  
  localStorage.setItem('userProfile', JSON.stringify(profile))
  return profile
}

// Get current user profile
export const getCurrentUserProfile = (): UserProfile | null => {
  if (typeof window === 'undefined') return null
  
  const profile = localStorage.getItem('userProfile')
  return profile ? JSON.parse(profile) : null
}

// Update user activity
export const updateUserActivity = () => {
  if (typeof window === 'undefined') return
  
  const profile = getCurrentUserProfile()
  if (profile) {
    profile.lastActive = new Date()
    localStorage.setItem('userProfile', JSON.stringify(profile))
  }
}

// Streak tracking system
export interface UserStreak {
  currentStreak: number
  longestStreak: number
  lastParticipationDate: string // ISO date string
  totalParticipations: number
  participationDates: string[] // Array of ISO date strings
}

// Get today's date in Chicago timezone (YYYY-MM-DD)
const getTodayDate = (): string => {
  return new Date().toLocaleDateString('en-CA', { 
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// Get yesterday's date in Chicago timezone
const getYesterdayDate = (): string => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toLocaleDateString('en-CA', { 
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// Check if a date is yesterday
const isYesterday = (dateString: string): boolean => {
  return dateString === getYesterdayDate()
}

// Check if a date is today
const isToday = (dateString: string): boolean => {
  return dateString === getTodayDate()
}
// Listen to votes in real-time for DIY opinions
export const subscribeToVotes = (
  opinionId: string, 
  callback: (votes: DIYVote[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'diy_votes'), 
    where('opinionId', '==', opinionId),
    orderBy('createdAt', 'desc')
  )
  
  return onSnapshot(q, (querySnapshot) => {
    const votes = querySnapshot.docs.map(doc => doc.data() as DIYVote)
    callback(votes)
  })
}

// Get user streak
export const getUserStreak = (): UserStreak => {
  if (typeof window === 'undefined') {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastParticipationDate: '',
      totalParticipations: 0,
      participationDates: []
    }
  }

  const streakData = localStorage.getItem('userStreak')
  if (!streakData) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastParticipationDate: '',
      totalParticipations: 0,
      participationDates: []
    }
  }

  const streak: UserStreak = JSON.parse(streakData)
  return streak
}

// Record user participation for streak tracking
export const recordUserParticipation = () => {
  if (typeof window === 'undefined') return
  
  const today = getTodayDate()
  const currentStreak = getUserStreak()
  
  // Don't record if already participated today
  if (currentStreak.participationDates.includes(today)) {
    return
  }
  
  const updatedStreak: UserStreak = {
    currentStreak: currentStreak.currentStreak + 1,
    longestStreak: Math.max(currentStreak.longestStreak, currentStreak.currentStreak + 1),
    lastParticipationDate: today,
    totalParticipations: currentStreak.totalParticipations + 1,
    participationDates: [...currentStreak.participationDates, today]
  }
  
  localStorage.setItem('userStreak', JSON.stringify(updatedStreak))
}

export { model as geminiModel }