"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown, MessageCircle, BarChart3, ArrowLeft } from 'lucide-react'
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { getOpinionByToken, submitVote, subscribeToVotes, generateWordCloudData, getVotesForOpinion } from '@/lib/firebase'
import WordCloudComponent from '@/components/WordCloud'

function OpinionVotingContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [opinion, setOpinion] = useState(null)
  const [votes, setVotes] = useState([])
  const [userVote, setUserVote] = useState(null)
  const [comment, setComment] = useState('')
  const [isVoting, setIsVoting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showWordCloud, setShowWordCloud] = useState(false)
  const [wordCloudData, setWordCloudData] = useState([])

  useEffect(() => {
    if (!token) {
      toast({
        title: "Missing token",
        description: "No opinion token provided.",
        variant: "destructive"
      })
      return
    }

    let unsubscribe: (() => void) | null = null
    let pollInterval: NodeJS.Timeout | null = null

    const loadOpinion = async () => {
      try {
        const opinionData = await getOpinionByToken(token)
        if (!opinionData) {
          toast({
            title: "Opinion not found",
            description: "This opinion link may be invalid or expired.",
            variant: "destructive"
          })
          return
        }
        setOpinion(opinionData)
        
        // Immediately load existing votes
        try {
          console.log('Loading votes for opinion:', opinionData.id)
          const initialVotes = await getVotesForOpinion(opinionData.id)
          console.log('Initial votes loaded:', initialVotes)
          console.log('Initial votes length:', initialVotes.length)
          console.log('Initial votes structure:', initialVotes.map(v => ({ 
            id: v.id, 
            vote: v.vote, 
            opinionId: v.opinionId,
            voterFingerprint: v.voterFingerprint?.substring(0, 8) + '...'
          })))
          setVotes(initialVotes)
          
          // Generate word cloud data
          const cloudData = generateWordCloudData(initialVotes)
          setWordCloudData(cloudData)
          
          // Check if current user has voted
          const voterFingerprint = localStorage.getItem('voterFingerprint')
          console.log('Current voter fingerprint:', voterFingerprint?.substring(0, 8) + '...')
          const existingVote = initialVotes.find(vote => vote.voterFingerprint === voterFingerprint)
          console.log('Existing vote found:', existingVote)
          setUserVote(existingVote)
        } catch (voteError) {
          console.error('Error loading initial votes:', voteError)
        }
        
        // Try to subscribe to real-time votes
        try {
          unsubscribe = subscribeToVotes(opinionData.id, (votesData) => {
            console.log('Real-time votes update:', votesData)
            setVotes(votesData)
            
            // Generate word cloud data
            const cloudData = generateWordCloudData(votesData)
            setWordCloudData(cloudData)
            
            // Check if current user has voted
            const voterFingerprint = localStorage.getItem('voterFingerprint')
            const existingVote = votesData.find(vote => vote.voterFingerprint === voterFingerprint)
            setUserVote(existingVote)
          })
        } catch (error) {
          console.log('Real-time subscription failed, falling back to polling:', error)
          // Fallback to polling if real-time subscription fails
          pollInterval = setInterval(async () => {
            try {
              const votesData = await getVotesForOpinion(opinionData.id)
              console.log('Polling votes update:', votesData)
              setVotes(votesData)
              
              // Generate word cloud data
              const cloudData = generateWordCloudData(votesData)
              setWordCloudData(cloudData)
              
              // Check if current user has voted
              const voterFingerprint = localStorage.getItem('voterFingerprint')
              const existingVote = votesData.find(vote => vote.voterFingerprint === voterFingerprint)
              setUserVote(existingVote)
            } catch (pollError) {
              console.error('Polling error:', pollError)
            }
          }, 3000) // Poll every 3 seconds
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error loading opinion:', error)
        toast({
          title: "Error loading opinion",
          description: "Please try again later.",
          variant: "destructive"
        })
        setLoading(false)
      }
    }

    loadOpinion()

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [token])

  const handleVote = async (voteType) => {
    if (!opinion || userVote) return

    setIsVoting(true)
    try {
      console.log('Submitting vote:', { opinionId: opinion.id, voteType, comment: comment.trim() })
      
      await submitVote(opinion.id, {
        vote: voteType,
        comment: comment.trim()
      })
      
      setComment('')
      toast({
        title: "Vote submitted!",
        description: "Thank you for participating in this discussion.",
      })
      
      // Force refresh votes after submission
      setTimeout(async () => {
        try {
          const votesData = await getVotesForOpinion(opinion.id)
          setVotes(votesData)
          
          // Generate word cloud data
          const cloudData = generateWordCloudData(votesData)
          setWordCloudData(cloudData)
          
          // Check if current user has voted
          const voterFingerprint = localStorage.getItem('voterFingerprint')
          const existingVote = votesData.find(vote => vote.voterFingerprint === voterFingerprint)
          setUserVote(existingVote)
        } catch (error) {
          console.error('Error refreshing votes after submission:', error)
        }
      }, 1000)
      
    } catch (error) {
      console.error('Error submitting vote:', error)
      toast({
        title: "Voting failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsVoting(false)
    }
  }

  const agreeCount = votes.filter(vote => vote.vote === 'agree').length
  const disagreeCount = votes.filter(vote => vote.vote === 'disagree').length
  const totalVotes = agreeCount + disagreeCount
  const agreePercentage = totalVotes > 0 ? (agreeCount / totalVotes) * 100 : 0

  // Debug logging
  console.log('Vote calculation:', {
    totalVotes: votes.length,
    agreeCount,
    disagreeCount,
    totalVotes,
    agreePercentage,
    votes: votes.map(v => ({ 
      vote: v.vote, 
      comment: v.comment?.substring(0, 20),
      id: v.id,
      opinionId: v.opinionId
    }))
  })
  
  // Additional debugging for vote filtering
  const agreeVotes = votes.filter(vote => vote.vote === 'agree')
  const disagreeVotes = votes.filter(vote => vote.vote === 'disagree')
  console.log('Agree votes:', agreeVotes.length, agreeVotes.map(v => ({ vote: v.vote, id: v.id })))
  console.log('Disagree votes:', disagreeVotes.length, disagreeVotes.map(v => ({ vote: v.vote, id: v.id })))
  
  // Validate vote structure
  const invalidVotes = votes.filter(vote => !vote.vote || (vote.vote !== 'agree' && vote.vote !== 'disagree'))
  if (invalidVotes.length > 0) {
    console.warn('Invalid votes found:', invalidVotes)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="font-serif">Loading opinion...</p>
        </div>
      </div>
    )
  }

  if (!opinion) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <h2 className="font-serif text-xl font-bold mb-2">Opinion Not Found</h2>
            <p className="text-gray-600 font-serif">This opinion link may be invalid or expired.</p>
            <Button 
              onClick={() => window.location.href = '/diy'}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Create Your Own Opinion
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b-4 border-black mb-6 p-6 text-center">
          <h1 className="text-4xl font-bold mb-2 font-serif tracking-tight">THE DEMOCRACY DAILY</h1>
          <p className="text-gray-600 font-serif">Private Opinion Discussion</p>
        </div>

        {/* Back Link */}
        <div className="mb-4">
          <a 
            href="/diy" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-serif"
          >
            <ArrowLeft className="h-4 w-4" />
            Create Your Own Opinion
          </a>
        </div>

        {/* Opinion Card */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="font-serif text-2xl">{opinion.title}</CardTitle>
            <p className="text-sm text-gray-600">By {opinion.authorName}</p>
          </CardHeader>
          <CardContent className="p-6">
            {opinion.photoUrl && (
              <div className="mb-4">
                <img 
                  src={opinion.photoUrl} 
                  alt="Opinion context" 
                  className="max-w-full h-auto rounded-lg shadow-md max-h-96 mx-auto"
                />
              </div>
            )}
            <p className="font-serif text-lg leading-relaxed italic">"{opinion.content}"</p>
          </CardContent>
        </Card>

        {/* Voting Results */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="font-serif flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Discussion Results ({totalVotes} {totalVotes === 1 ? 'vote' : 'votes'})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-500 flex items-center justify-center text-white font-bold text-sm"
                  style={{ width: `${agreePercentage}%` }}
                >
                  {agreePercentage > 15 && `${Math.round(agreePercentage)}% Agree`}
                </div>
                <div 
                  className="bg-red-500 h-full absolute top-0 right-0 flex items-center justify-center text-white font-bold text-sm"
                  style={{ width: `${100 - agreePercentage}%` }}
                >
                  {(100 - agreePercentage) > 15 && `${Math.round(100 - agreePercentage)}% Disagree`}
                </div>
              </div>
              
              {/* Vote Counts */}
              <div className="flex justify-between text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  {agreeCount} Agree
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                  {disagreeCount} Disagree
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voting Section */}
        {!userVote ? (
          <Card className="mb-6 shadow-lg border-0">
            <CardHeader className="bg-blue-50 border-b">
              <CardTitle className="font-serif">What do you think?</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts (optional) - this will be included in the discussion word cloud..."
                rows={3}
                className="font-serif"
              />
              
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleVote('agree')}
                  disabled={isVoting}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-8"
                >
                  <ThumbsUp className="h-4 w-4" />
                  {isVoting ? 'Submitting...' : 'I Agree'}
                </Button>
                <Button
                  onClick={() => handleVote('disagree')}
                  disabled={isVoting}
                  variant="destructive"
                  className="flex items-center gap-2 px-8"
                >
                  <ThumbsDown className="h-4 w-4" />
                  {isVoting ? 'Submitting...' : 'I Disagree'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 shadow-lg border-0">
            <CardContent className="p-6 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                userVote.vote === 'agree' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {userVote.vote === 'agree' ? (
                  <ThumbsUp className="h-4 w-4" />
                ) : (
                  <ThumbsDown className="h-4 w-4" />
                )}
                You {userVote.vote === 'agree' ? 'agreed' : 'disagreed'} with this opinion
              </div>
              {userVote.comment && (
                <p className="mt-2 text-sm text-gray-600 italic">
                  Your comment: "{userVote.comment}"
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Word Cloud Section */}
        {wordCloudData.length > 0 && (
          <Card className="mb-6 shadow-lg border-0">
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Discussion Word Cloud
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWordCloud(!showWordCloud)}
                >
                  {showWordCloud ? 'Hide' : 'Show'} Word Cloud
                </Button>
              </div>
            </CardHeader>
            {showWordCloud && (
              <CardContent className="p-6">
                <WordCloudComponent data={wordCloudData} />
                <p className="text-xs text-gray-500 text-center mt-2">
                  Generated from {votes.filter(v => v.comment).length} participant comments
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Comments Section */}
        {votes.filter(vote => vote.comment).length > 0 && (
          <Card className="mb-6 shadow-lg border-0">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="font-serif">Comments</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {votes
                .filter(vote => vote.comment)
                .map((vote, index) => (
                  <div key={index} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      {vote.vote === 'agree' ? (
                        <ThumbsUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <ThumbsDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {vote.vote === 'agree' ? 'Agrees' : 'Disagrees'}
                      </span>
                    </div>
                    <p className="font-serif text-sm">{vote.comment}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
      <Toaster />
    </div>
  )
}

export default function OpinionVotingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="font-serif">Loading...</p>
        </div>
      </div>
    }>
      <OpinionVotingContent />
    </Suspense>
  )
} 