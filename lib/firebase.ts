// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { useState, useEffect } from 'react';

// Your web app's Firebase configuration
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export { db };

export interface Opinion {
  id: string;
  content: string;
  publishDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getTodayOpinion(): Promise<Opinion | null> {
  const today = new Date().toISOString().split("T")[0];
  const docRef = doc(db, "dailyOpinions", today);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists() && docSnap.data().isActive) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Opinion;
  } else {
    return null;
  }
}

export interface UserResponse {
  id: string;
  opinionId: string;
  stance: 'agree' | 'disagree';
  reasoning: string;
  timestamp: Date;
}

// UPDATED: Now uses the new Cloud Function
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
    });

    const result = await response.json();
    
    if (result.success) {
      console.log("Response submitted successfully");
      return true;
    } else {
      console.error("Error submitting response:", result.error);
      return false;
    }
  } catch (error) {
    console.error("Error submitting response:", error);
    return false;
  }
}

export interface OpinionStats {
  agreeCount: number;
  disagreeCount: number;
  totalResponses: number;
  agreePercentage: number;
  disagreePercentage: number;
}

// Keep existing function for backward compatibility
export async function getOpinionStats(opinionId: string): Promise<OpinionStats> {
  const responsesRef = collection(db, "responses");
  const q = query(responsesRef, where("opinionId", "==", opinionId));
  const querySnapshot = await getDocs(q);
  
  let agreeCount = 0;
  let disagreeCount = 0;
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.stance === "agree") {
      agreeCount++;
    } else if (data.stance === "disagree") {
      disagreeCount++;
    }
  });
  
  const totalResponses = agreeCount + disagreeCount;
  const agreePercentage = totalResponses > 0 ? Math.round((agreeCount / totalResponses) * 100) : 0;
  
  return {
    agreeCount,
    disagreeCount,
    totalResponses,
    agreePercentage,
    disagreePercentage: 100 - agreePercentage
  };
}


// NEW: Real-time stats hook
export function useRealTimeStats(opinionId: string) {
  const [stats, setStats] = useState<OpinionStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!opinionId) return;

    const q = query(
      collection(db, "responses"),
      where("opinionId", "==", opinionId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let agreeCount = 0;
      let disagreeCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.stance === "agree") agreeCount++;
        else if (data.stance === "disagree") disagreeCount++;
      });

      const totalResponses = agreeCount + disagreeCount;
      const agreePercentage = totalResponses > 0 ? Math.round((agreeCount / totalResponses) * 100) : 0;
      
      setStats({
        agreeCount,
        disagreeCount,
        totalResponses,
        agreePercentage,
        disagreePercentage: 100 - agreePercentage,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [opinionId]);

  return { stats, loading };
}

// NEW: Real-time word cloud data hook
export function useRealTimeWordCloud(opinionId: string, stance: 'agree' | 'disagree') {
  const [wordData, setWordData] = useState<[string, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [responseCount, setResponseCount] = useState(0);

  // Process text into word frequencies
  const processText = (text: string): [string, number][] => {
    if (!text || text.trim().length === 0) return [];

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
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word));

    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60) as [string, number][];
  };

  useEffect(() => {
    if (!opinionId || !stance) return;

    const q = query(
      collection(db, "responses"),
      where("opinionId", "==", opinionId),
      where("stance", "==", stance),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const responses: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.reasoning) {
          responses.push(data.reasoning);
        }
      });

      // Combine all text and process
      const combinedText = responses.join(' ');
      const wordFrequencies = processText(combinedText);
      
      setWordData(wordFrequencies);
      setResponseCount(responses.length);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [opinionId, stance]);

  return { wordData, loading, responseCount };
}

// Keep existing functions for backward compatibility
export interface SeparatedReasoning {
  agreeReasons: string[];
  disagreeReasons: string[];
}

export async function getReasoningByStance(opinionId: string): Promise<SeparatedReasoning> {
  try {
    const responsesRef = collection(db, "responses");
    const q = query(responsesRef, where("opinionId", "==", opinionId));
    const querySnapshot = await getDocs(q);
    
    const agreeReasons: string[] = [];
    const disagreeReasons: string[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.stance === "agree") {
        agreeReasons.push(data.reasoning);
      } else if (data.stance === "disagree") {
        disagreeReasons.push(data.reasoning);
      }
    });
    
    return {
      agreeReasons,
      disagreeReasons
    };
  } catch (error) {
    console.error("Error getting reasoning by stance:", error);
    return { agreeReasons: [], disagreeReasons: [] };
  }
}
// Add this new function to fetch user's actual response
export async function getUserResponse(userId: string, opinionId: string): Promise<UserResponse | null> {
  try {
    const responsesRef = collection(db, "responses");
    const q = query(
      responsesRef, 
      where("userId", "==", userId),
      where("opinionId", "==", opinionId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      return {
        id: userDoc.id,
        opinionId: userData.opinionId,
        stance: userData.stance,
        reasoning: userData.reasoning,
        timestamp: userData.timestamp
      } as UserResponse;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching user response:", error);
    return null;
  }
}