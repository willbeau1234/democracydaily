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
  onSnapshot, 
  orderBy,
  Timestamp 
} from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from 'uuid'

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
 
 

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const storage = getStorage(app)
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
}

export async function submitResponse(
  opinionId: string, 
  stance: 'agree' | 'disagree', 
  reasoning: string,
  userId?: string
): Promise<boolean> {
  try {
    const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/submitResponse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        opinionId,
        stance,
        reasoning,
        userId: userId || 'anonymous'
      }),
    })

    const result = await response.json()
    
    if (result.success) {
      console.log("Response submitted successfully")
      // Record user participation for streak tracking
      await recordUserParticipation()
      return true
    } else {
      console.error("Error submitting response:", result.error)
      return false
    }
  } catch (error) {
    console.error("Error submitting response:", error)
    return false
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

export function useRealTimeStats(opinionId: string) {
  const [stats, setStats] = useState<OpinionStats | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!opinionId) return

    const q = query(
      collection(db, "responses"),
      where("opinionId", "==", opinionId)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let agreeCount = 0
      let disagreeCount = 0

      snapshot.forEach((doc) => {
        const data = doc.data()
        if (data.stance === "agree") agreeCount++
        else if (data.stance === "disagree") disagreeCount++
      })

      const totalResponses = agreeCount + disagreeCount
      const agreePercentage = totalResponses > 0 ? Math.round((agreeCount / totalResponses) * 100) : 0
      
      setStats({
        agreeCount,
        disagreeCount,
        totalResponses,
        agreePercentage,
        disagreePercentage: 100 - agreePercentage,
      })
      setLoading(false)
    })

    return () => unsubscribe()
  }, [opinionId])

  return { stats, loading }
}

export function useRealTimeWordCloud(opinionId: string, stance: 'agree' | 'disagree') {
  const [wordData, setWordData] = useState<[string, number][]>([])
  const [loading, setLoading] = useState(true)
  const [responseCount, setResponseCount] = useState(0)

  const processText = (text: string): [string, number][] => {
    if (!text || text.trim().length === 0) return []

    const stopwords = new Set([
      'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
      'she', 'her', 'it', 'its', 'they', 'them', 'their', 'this', 'that',
      'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'a', 'an',
      'the', 'and', 'but', 'if', 'or', 'because', 'as', 'of', 'at', 'by',
      'for', 'with', 'in', 'on', 'to', 'from', 'will', 'would', 'could',
      'should', 'can', 'may', 'might', 'must', 'about', 'up', 'down',
      'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
      'really', 'need', 'feel', 'believe', 'think', 'know', 'get', 'like',
      'also', 'just', 'now', 'well', 'way', 'make', 'take', 'come', 'go'
    ])

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word))

    const wordCount: { [key: string]: number } = {}
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60) as [string, number][]
  }

  useEffect(() => {
    if (!opinionId || !stance) return

    const q = query(
      collection(db, "responses"),
      where("opinionId", "==", opinionId),
      where("stance", "==", stance),
      orderBy("timestamp", "desc")
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const responses: string[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        if (data.reasoning) {
          responses.push(data.reasoning)
        }
      })

      const combinedText = responses.join(' ')
      const wordFrequencies = processText(combinedText)
      
      setWordData(wordFrequencies)
      setResponseCount(responses.length)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [opinionId, stance])

  return { wordData, loading, responseCount }
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

// NEW DIY OPINION FUNCTIONALITY
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
      await recordUserParticipation()
      
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

// Generate anonymous voter fingerprint
const getOrCreateVoterFingerprint = (): string => {
  let fingerprint = localStorage.getItem('voterFingerprint')
  if (!fingerprint) {
    fingerprint = uuidv4()
    localStorage.setItem('voterFingerprint', fingerprint)
  }
  return fingerprint
}

// Generate anonymous user ID (consistent across all features)
const getOrCreateUserId = (): string => {
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
  const profile = localStorage.getItem('userProfile')
  return profile ? JSON.parse(profile) : null
}

// Update user activity
export const updateUserActivity = () => {
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

// Get today's date in ISO format (YYYY-MM-DD)
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0]
}

// Get yesterday's date in ISO format
const getYesterdayDate = (): string => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

// Check if a date is yesterday
const isYesterday = (dateString: string): boolean => {
  return dateString === getYesterdayDate()
}

// Check if a date is today
const isToday = (dateString: string): boolean => {
  return dateString === getTodayDate()
}

// Calculate streak from participation dates
const calculateStreak = (participationDates: string[]): { currentStreak: number, longestStreak: number } => {
  if (participationDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Sort dates in descending order (most recent first)
  const sortedDates = [...participationDates].sort((a, b) => b.localeCompare(a))
  
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let expectedDate = getTodayDate()
  
  // Check if user participated today or yesterday to determine if streak is active
  const hasRecentParticipation = isToday(sortedDates[0]) || isYesterday(sortedDates[0])
  
  if (hasRecentParticipation) {
    // Calculate current streak
    for (let i = 0; i < 365; i++) {
      const dateStr = expectedDate
      if (sortedDates.includes(dateStr)) {
        tempStreak++
        // Move to previous day
        const prevDate = new Date(expectedDate)
        prevDate.setDate(prevDate.getDate() - 1)
        expectedDate = prevDate.toISOString().split('T')[0]
      } else {
        break
      }
    }
    currentStreak = tempStreak
  }
  
  // Calculate longest streak from all dates
  let maxStreak = 0
  let currentMaxStreak = 0
  let lastDate: string | null = null
  
  for (const date of sortedDates) {
    if (lastDate === null) {
      currentMaxStreak = 1
    } else {
      const lastDateObj = new Date(lastDate)
      const currentDateObj = new Date(date)
      const diffTime = lastDateObj.getTime() - currentDateObj.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        currentMaxStreak++
      } else {
        maxStreak = Math.max(maxStreak, currentMaxStreak)
        currentMaxStreak = 1
      }
    }
    lastDate = date
  }
  
  longestStreak = Math.max(maxStreak, currentMaxStreak, currentStreak)
  
  return { currentStreak, longestStreak }
}

// Record user participation (call this when user votes or creates opinion)
export const recordUserParticipation = async (): Promise<UserStreak> => {
  const userId = getOrCreateUserId()
  const today = getTodayDate()
  
  // Get current streak data
  const currentStreak = getUserStreak()
  
  // Check if user already participated today
  if (currentStreak.participationDates.includes(today)) {
    return currentStreak
  }
  
  // Add today to participation dates
  const newParticipationDates = [...currentStreak.participationDates, today]
  
  // Calculate new streak
  const { currentStreak: newCurrentStreak, longestStreak: newLongestStreak } = calculateStreak(newParticipationDates)
  
  // Create updated streak data
  const updatedStreak: UserStreak = {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastParticipationDate: today,
    totalParticipations: newParticipationDates.length,
    participationDates: newParticipationDates
  }
  
  // Save to localStorage
  localStorage.setItem(`userStreak_${userId}`, JSON.stringify(updatedStreak))
  
  // Also save to Firestore for cross-device sync (optional)
  try {
    await addDoc(collection(db, 'user_streaks'), {
      userId,
      ...updatedStreak,
      updatedAt: new Date()
    })
  } catch (error) {
    console.log('Could not sync streak to Firestore:', error)
  }
  
  return updatedStreak
}

// Get user's current streak
export const getUserStreak = (): UserStreak => {
  const userId = getOrCreateUserId()
  const storedStreak = localStorage.getItem(`userStreak_${userId}`)
  
  if (storedStreak) {
    const streak = JSON.parse(storedStreak)
    // Recalculate streak in case dates have changed
    const { currentStreak, longestStreak } = calculateStreak(streak.participationDates)
    return {
      ...streak,
      currentStreak,
      longestStreak
    }
  }
  
  // Return default streak for new users
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastParticipationDate: '',
    totalParticipations: 0,
    participationDates: []
  }
}

// Check if user participated today
export const hasParticipatedToday = (): boolean => {
  const streak = getUserStreak()
  return streak.participationDates.includes(getTodayDate())
}

// Get streak status for display
export const getStreakStatus = (): { 
  currentStreak: number, 
  longestStreak: number, 
  hasParticipatedToday: boolean,
  nextMilestone: number 
} => {
  const streak = getUserStreak()
  const participatedToday = hasParticipatedToday()
  
  // Calculate next milestone (next multiple of 5)
  const nextMilestone = Math.ceil((streak.currentStreak + 1) / 5) * 5
  
  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    hasParticipatedToday: participatedToday,
    nextMilestone
  }
}