"use client"
import { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { OpinionStats, DIYVote } from '../lib/firebase'

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

// Listen to votes in real-time for DIY opinions
export const useRealTimeVotes = (
  opinionId: string
): { votes: DIYVote[], loading: boolean } => {
  const [votes, setVotes] = useState<DIYVote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!opinionId) return

    const q = query(
      collection(db, 'diy_votes'), 
      where('opinionId', '==', opinionId),
      orderBy('createdAt', 'desc')
    )
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const votesData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }) as DIYVote)
      
      setVotes(votesData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [opinionId])

  return { votes, loading }
}