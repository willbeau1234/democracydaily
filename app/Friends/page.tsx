"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, ThumbsDown, Users, Clock, Search, UserPlus, X, Check } from "lucide-react"
import OpinionDropdown from "@/components/OpinionDropdown"

// Interfaces for friend system
interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface FriendOpinion {
  id: string;
  userId: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  stance: 'agree' | 'disagree';
  reasoning: string;
  timestamp: any;
  createdAt: string;
}

interface SearchResult {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: any;
}

// Helper to get auth token
async function getAuthToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  
  try {
    return await currentUser.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export default function FriendsOpinionApp() {
  // Authentication state
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Friends data
  const [friendsOpinions, setFriendsOpinions] = useState<FriendOpinion[]>([])
  const [loadingOpinions, setLoadingOpinions] = useState(false)
  
  // Search state
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sendingRequest, setSendingRequest] = useState<string | null>(null)
  
  // Card swipe state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const dragStartX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Load friends' opinions when user is authenticated
  useEffect(() => {
    if (user) {
      createUserProfile()
      loadFriendsOpinions()
    }
  }, [user])

  const createUserProfile = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return
      
      await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/createUserProfile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('Error creating user profile:', error)
    }
  }

  const loadFriendsOpinions = async () => {
    try {
      setLoadingOpinions(true)
      const token = await getAuthToken()
      if (!token) {
        console.log('❌ No auth token available')
        return
      }
      
      console.log('🔄 Loading friends\' opinions...')
      
      const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getFriendsOpinions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      console.log('📦 getFriendsOpinions response:', data)
      
      if (data.success) {
        console.log(`✅ Found ${data.friendsOpinions?.length || 0} friends' opinions`)
        if (data.message) {
          console.log('ℹ️ Message:', data.message)
        }
        if (data.totalFriends !== undefined) {
          console.log(`👫 Total friends: ${data.totalFriends}`)
          console.log(`💭 Friends with opinions: ${data.friendsWithOpinions}`)
        }
        setFriendsOpinions(data.friendsOpinions || [])
      } else {
        console.error('❌ Failed to load friends opinions:', data.error)
        alert(`Error loading friends: ${data.error}`)
      }
    } catch (error) {
      console.error('❌ Error loading friends opinions:', error)
      alert('Error loading friends. Please check console for details.')
    } finally {
      setLoadingOpinions(false)
    }
  }

  const searchUsers = async (term: string) => {
    if (term.length < 2) {
      setSearchResults([])
      return
    }
    
    try {
      setSearching(true)
      const token = await getAuthToken()
      if (!token) return
      
      const response = await fetch(`https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/searchUsers?searchTerm=${encodeURIComponent(term)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      if (data.success) {
        setSearchResults(data.users || [])
      } else {
        console.error('Search failed:', data.error)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setSearching(false)
    }
  }

  const sendFriendRequest = async (targetUserId: string) => {
    try {
      setSendingRequest(targetUserId)
      const token = await getAuthToken()
      if (!token) return
      
      console.log(`🔄 Sending friend request to: ${targetUserId}`)
      
      const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/sendFriendRequest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId })
      })
      
      const data = await response.json()
      console.log('📦 sendFriendRequest response:', data)
      
      if (data.success) {
        console.log('✅ Friend request sent successfully')
        alert('Friend request sent!')
        // Remove from search results
        setSearchResults(prev => prev.filter(user => user.uid !== targetUserId))
      } else {
        console.error('❌ Failed to send friend request:', data.error)
        alert(data.error || 'Failed to send friend request')
      }
    } catch (error) {
      console.error('❌ Error sending friend request:', error)
      alert('Error sending friend request')
    } finally {
      setSendingRequest(null)
    }
  }

  // Debug function to help troubleshoot friends system
  const debugFriendsSystem = async () => {
    try {
      const token = await getAuthToken()
      if (!token) {
        alert('Not authenticated')
        return
      }

      console.log('🔍 DEBUGGING FRIENDS SYSTEM:')
      console.log('Current user:', user)
      
      // Try to get friends opinions with detailed logging
      console.log('1. Testing getFriendsOpinions...')
      const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getFriendsOpinions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      console.log('Full response:', data)
      
      if (data.message) {
        alert(`Debug Info: ${data.message}\nCheck console for full details.`)
      } else {
        alert(`Found ${data.friendsOpinions?.length || 0} friends' opinions.\nCheck console for details.`)
      }
    } catch (error) {
      console.error('Debug error:', error)
      alert('Debug failed - check console')
    }
  }

  // Handle search input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchUsers(searchTerm)
      }
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    dragStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const currentX = e.touches[0].clientX
    const diff = currentX - dragStartX.current
    setDragOffset(diff)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return

    setIsDragging(false)
    const threshold = 100

    if (Math.abs(dragOffset) > threshold) {
      setIsAnimating(true)

      if (dragOffset > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setTimeout(() => {
          setCurrentIndex((prev) => prev - 1)
          setDragOffset(0)
          setIsAnimating(false)
        }, 300)
      } else if (dragOffset < 0 && currentIndex < friendsOpinions.length - 1) {
        // Swipe left - go to next
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1)
          setDragOffset(0)
          setIsAnimating(false)
        }, 300)
      } else {
        // Snap back
        setDragOffset(0)
        setIsAnimating(false)
      }
    } else {
      // Snap back
      setDragOffset(0)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartX.current = e.clientX
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const currentX = e.clientX
    const diff = currentX - dragStartX.current
    setDragOffset(diff)
  }

  const handleMouseUp = () => {
    if (!isDragging) return

    setIsDragging(false)
    const threshold = 100

    if (Math.abs(dragOffset) > threshold) {
      setIsAnimating(true)

      if (dragOffset > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setTimeout(() => {
          setCurrentIndex((prev) => prev - 1)
          setDragOffset(0)
          setIsAnimating(false)
        }, 300)
      } else if (dragOffset < 0 && currentIndex < friendsOpinions.length - 1) {
        // Swipe left - go to next
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1)
          setDragOffset(0)
          setIsAnimating(false)
        }, 300)
      } else {
        // Snap back
        setDragOffset(0)
        setIsAnimating(false)
      }
    } else {
      // Snap back
      setDragOffset(0)
    }
  }

  const getCardStyle = (index: number) => {
    const position = index - currentIndex
    const absPosition = Math.abs(position)

    if (absPosition > 2) return { display: "none" }

    let transform = ""
    const zIndex = 10 - absPosition
    let opacity = 1
    let scale = 1

    if (position === 0) {
      // Current card
      const rotation = dragOffset * 0.1
      const translateX = isDragging ? dragOffset : isAnimating ? (dragOffset > 0 ? 400 : -400) : 0
      transform = `translateX(${translateX}px) rotate(${rotation}deg)`
      opacity = isDragging ? Math.max(0.7, 1 - Math.abs(dragOffset) / 300) : isAnimating ? 0 : 1
    } else if (position === 1) {
      // Next card
      scale = 0.95 - (absPosition - 1) * 0.05
      const translateY = 10 + (absPosition - 1) * 10
      const translateX = isDragging && dragOffset < 0 ? Math.max(-50, dragOffset * 0.3) : 0
      transform = `translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`
      opacity = 0.8 - (absPosition - 1) * 0.2
    } else if (position === -1) {
      // Previous card (hidden behind)
      scale = 0.9
      transform = `translateY(20px) scale(${scale})`
      opacity = 0.3
    } else {
      // Cards further away
      scale = 0.85 - (absPosition - 2) * 0.05
      const translateY = 20 + (absPosition - 1) * 10
      transform = `translateY(${translateY}px) scale(${scale})`
      opacity = Math.max(0.1, 0.6 - (absPosition - 2) * 0.2)
    }

    return {
      transform,
      zIndex,
      opacity,
      transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    }
  }

  const formatTimestamp = (timestamp: any): string => {
    try {
      let date: Date;
      
      if (timestamp?.seconds) {
        // Firestore Timestamp
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp?.toDate) {
        // Firestore Timestamp object
        date = timestamp.toDate();
      } else if (typeof timestamp === 'string') {
        // ISO string
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        // Already a Date object
        date = timestamp;
      } else {
        return 'Recently';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  const renderFriendCard = (friend: FriendOpinion, index: number) => (
    <Card
      key={friend.id}
      className="absolute inset-0 shadow-2xl cursor-grab active:cursor-grabbing select-none"
      style={getCardStyle(index)}
      onTouchStart={index === currentIndex ? handleTouchStart : undefined}
      onTouchMove={index === currentIndex ? handleTouchMove : undefined}
      onTouchEnd={index === currentIndex ? handleTouchEnd : undefined}
      onMouseDown={index === currentIndex ? handleMouseDown : undefined}
      onMouseMove={index === currentIndex ? handleMouseMove : undefined}
      onMouseUp={index === currentIndex ? handleMouseUp : undefined}
      onMouseLeave={index === currentIndex ? handleMouseUp : undefined}
    >
      <CardContent className="p-6 h-full">
        <div className="space-y-4 h-full flex flex-col">
          {/* Friend Header */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white shadow-lg">
              <AvatarImage src={friend.photoURL} alt={friend.displayName} />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-semibold">
                {friend.displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 text-lg">{friend.displayName}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={friend.stance === "agree" ? "default" : "destructive"}
                  className={`${
                    friend.stance === "agree" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {friend.stance === "agree" ? (
                    <>
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Agrees
                    </>
                  ) : (
                    <>
                      <ThumbsDown className="w-3 h-3 mr-1" />
                      Disagrees
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          {/* Opinion Text */}
          <div className="bg-gray-50 rounded-lg p-4 flex-1">
            <p className="text-gray-800 leading-relaxed text-base">"{friend.reasoning}"</p>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {formatTimestamp(friend.timestamp)}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to view friends' opinions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Newspaper-style header */}
        <div className="bg-white border-b-4 border-black mb-4 sm:mb-6 p-4 sm:p-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 font-serif tracking-tight">THE DEMOCRACY DAILY</h1>
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-gray-600 border-t border-b border-gray-300 py-2 px-2 sm:px-4 my-2 gap-2 sm:gap-0">
            <span>Vol. 1, No. 1</span>
            <span>{new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</span>
            
            {/* Opinion Section Dropdown */}
            <OpinionDropdown sectionName="Friends" currentPage="Friends" />
          </div>
        </div>

        {/* Friends Header with Search Button */}
        <div className="text-center pt-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1" />
            <h2 className="text-2xl font-bold text-gray-900">Friends' Opinions</h2>
            <div className="flex-1 flex justify-end gap-2">
              <button
                onClick={debugFriendsSystem}
                className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors text-xs"
                title="Debug friends system"
              >
                🐛
              </button>
              <button
                onClick={loadFriendsOpinions}
                className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
                title="Refresh friends' opinions"
              >
                🔄
              </button>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
                title="Search for friends"
              >
                {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <p className="text-gray-600">
            {friendsOpinions.length > 0 
              ? "Swipe to see what your friends are thinking" 
              : "Add friends to see their opinions! Use the 🐛 button if you think there's an issue."}
          </p>
        </div>

        {/* Search Interface */}
        {showSearch && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            {searching && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <div key={result.uid} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={result.photoURL} alt={result.displayName} />
                        <AvatarFallback className="bg-purple-100 text-purple-600">
                          {result.displayName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{result.displayName}</p>
                        <p className="text-sm text-gray-500">{result.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => sendFriendRequest(result.uid)}
                      disabled={sendingRequest === result.uid}
                      className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {sendingRequest === result.uid ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {searchTerm.length >= 2 && !searching && searchResults.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No users found matching "{searchTerm}"
              </div>
            )}
          </div>
        )}

        {/* Card Stack Container */}
        <div className="relative h-[500px] mb-6">
          {friendsOpinions.map((friend, index) => renderFriendCard(friend, index))}

          {/* Loading state */}
          {loadingOpinions && (
            <Card className="absolute inset-0 shadow-2xl">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading friends' opinions...</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Empty state - no friends yet */}
          {!loadingOpinions && friendsOpinions.length === 0 && (
            <Card className="absolute inset-0 shadow-2xl">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-4">
                    <Users className="w-16 h-16 mx-auto mb-4" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">No Friends' Opinions Yet</h4>
                  <p className="text-gray-500 mb-4">Add friends to see their daily opinions here!</p>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="flex items-center gap-2 mx-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Search className="w-4 h-4" />
                    Search for Friends
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state - seen all opinions */}
          {!loadingOpinions && friendsOpinions.length > 0 && currentIndex >= friendsOpinions.length && (
            <Card className="absolute inset-0 shadow-2xl">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-4">
                    <Check className="w-16 h-16 mx-auto mb-4" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">All Caught Up!</h4>
                  <p className="text-gray-500 mb-4">You've seen all your friends' opinions for today.</p>
                  <button
                    onClick={() => loadFriendsOpinions()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Refresh
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Progress Indicator - only show if there are opinions */}
        {friendsOpinions.length > 0 && (
          <div className="flex justify-center mb-4 gap-2">
            {friendsOpinions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "bg-purple-500 w-6" : index < currentIndex ? "bg-purple-300" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        )}

        {/* Swipe Instructions - only show if there are opinions */}
        {friendsOpinions.length > 0 && (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">
              {currentIndex < friendsOpinions.length - 1 ? "Swipe left for next" : ""}
              {currentIndex > 0 && currentIndex < friendsOpinions.length - 1 ? " • " : ""}
              {currentIndex > 0 ? "Swipe right for previous" : ""}
            </p>
            <div className="flex justify-center items-center gap-2 text-xs text-gray-400">
              <span>
                {Math.min(currentIndex + 1, friendsOpinions.length)} of {friendsOpinions.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
