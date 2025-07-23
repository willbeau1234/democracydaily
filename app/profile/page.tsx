'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { AuthUser, UserProfile, OpinionResponse } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Save, Check, X, Users, Bell, UserCheck } from "lucide-react";
import OpinionDropdown from "@/components/OpinionDropdown";

// User Summary Interface
interface UserSummary {
  userId: string;
  totalResponses: number;
  participationDates: string[];
  responsesByDate: Record<string, string>;
  stancesByDate: Record<string, string>;
  stats: {
    agreeCount: number;
    disagreeCount: number;
  };
  currentStreak: number;
  lastResponse: string;
  lastResponseTime: string;
}

// Friend Request Interface
interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accept' | 'decline';
  createdAt: any;
  senderName?: string;
  senderEmail?: string;
  senderPhotoURL?: string;
}

// Friend Interface
interface Friend {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: any;
  hasSubmittedToday: boolean;
  lastSubmissionDate?: string;
  todayOpinion?: {
    stance: 'agree' | 'disagree';
    reasoning: string;
    timestamp: any;
  };
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

// Friend Requests Manager Component
function FriendRequestsManager({ userId }: { userId: string }) {
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRequests();
  }, [userId]);

  const fetchPendingRequests = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getPendingFriendRequests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setPendingRequests(data.requests || []);
      } else {
        console.error('Error fetching friend requests:', data.error);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (requestId: string, response: 'accept' | 'decline') => {
    try {
      setResponding(requestId);
      const token = await getAuthToken();
      if (!token) return;

      const apiResponse = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/respondToFriendRequest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId, response })
      });

      const data = await apiResponse.json();
      console.log(`📦 respondToFriendRequest response:`, data);
      
      if (data.success) {
        // Remove the request from the list
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        
        if (response === 'accept') {
          console.log('✅ Friend request accepted - friendship should be created');
          alert('Friend request accepted! You are now friends.');
        } else {
          console.log('❌ Friend request declined');
          alert('Friend request declined.');
        }
      } else {
        console.error('❌ Error responding to friend request:', data.error);
        alert('Error responding to friend request: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error responding to friend request:', error);
      alert('Error responding to friend request. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Friend Requests
        </h4>
        <div className="text-gray-500">Loading friend requests...</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        Friend Requests
        {pendingRequests.length > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {pendingRequests.length}
          </span>
        )}
      </h4>
      
      {pendingRequests.length === 0 ? (
        <div className="text-gray-500 text-center py-4">
          No pending friend requests
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={request.senderPhotoURL} alt={request.senderName} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {request.senderName?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">{request.senderName || 'Unknown User'}</p>
                  <p className="text-sm text-gray-500">{request.senderEmail}</p>
                  <p className="text-xs text-gray-400">
                    Sent {new Date(request.createdAt.seconds * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => respondToRequest(request.id, 'accept')}
                  disabled={responding === request.id}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {responding === request.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Accept
                </Button>
                <Button
                  onClick={() => respondToRequest(request.id, 'decline')}
                  disabled={responding === request.id}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  {responding === request.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Friends Manager Component
function FriendsManager({ userId }: { userId: string }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  const fetchFriends = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getFriends', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        // Transform the data to include submission status
        const friendsWithStatus = await Promise.all(
          (data.friends || []).map(async (friend: any) => {
            const today = new Date().toISOString().split('T')[0];
            
            // Check if friend has submitted today by looking for their response
            try {
              // Ensure friend has a valid userId (try multiple properties)
              const friendUserId = friend.userId || friend.uid;
              if (!friendUserId) {
                console.warn('Friend missing userId:', friend);
                return {
                  ...friend,
                  userId: friend.uid || 'unknown',
                  hasSubmittedToday: false,
                  lastSubmissionDate: null
                };
              }
              
              const responseQuery = query(
                collection(db, 'responses'),
                where('userId', '==', friendUserId),
                where('opinionId', '==', today)
              );
              const responseSnapshot = await getDocs(responseQuery);
              const hasSubmittedToday = !responseSnapshot.empty;
              
              let lastSubmissionDate = null;
              let todayOpinion = null;
              if (!responseSnapshot.empty) {
                const response = responseSnapshot.docs[0].data();
                lastSubmissionDate = response.opinionId;
                todayOpinion = {
                  stance: response.stance,
                  reasoning: response.reasoning,
                  timestamp: response.timestamp
                };
              }

              return {
                ...friend,
                userId: friendUserId,
                hasSubmittedToday,
                lastSubmissionDate,
                todayOpinion
              };
            } catch (error) {
              console.error('Error checking friend submission status:', error);
              return {
                ...friend,
                hasSubmittedToday: false,
                lastSubmissionDate: null
              };
            }
          })
        );
        
        setFriends(friendsWithStatus);
      } else {
        console.error('Error fetching friends:', data.error);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendNudge = async (friendId: string, friendName: string) => {
    try {
      setNudging(friendId);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/sendNudge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Nudge sent to ${friendName}! They'll get a friendly reminder to share their opinion.`);
      } else {
        alert('Error sending nudge: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending nudge:', error);
      alert('Error sending nudge. Please try again.');
    } finally {
      setNudging(null);
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5" />
          Your Friends
        </h4>
        <div className="text-gray-500">Loading your friends...</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <UserCheck className="w-5 h-5" />
        Your Friends
        {friends.length > 0 && (
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {friends.length}
          </span>
        )}
      </h4>
      
      {friends.length === 0 ? (
        <div className="text-gray-500 text-center py-4">
          <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>You haven't added any friends yet</p>
          <p className="text-sm mt-1">Visit the Friends page to add friends and see their opinions!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {friends.map((friend) => (
            <div key={friend.userId || friend.uid || `friend-${Math.random()}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={friend.photoURL} alt={friend.displayName} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {friend.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">{friend.displayName}</p>
                  <p className="text-sm text-gray-500">{friend.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {friend.hasSubmittedToday ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" />
                        Has submitted today
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                        <X className="w-3 h-3" />
                        Has not submitted today
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!friend.hasSubmittedToday && (
                  <Button
                    onClick={() => sendNudge(friend.userId, friend.displayName)}
                    disabled={nudging === friend.userId}
                    size="sm"
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    {nudging === friend.userId ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    Nudge
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>💡 Tip:</strong> Use the "Nudge" button to send a friendly reminder to friends who haven't shared their opinion today. 
              They'll get a notification encouraging them to participate in today's discussion!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// GitHub-style Calendar Component
function OpinionCalendar({ authUserId }: { authUserId: string }) {
  const [responses, setResponses] = useState<OpinionResponse[]>([]);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePhotoURL, setProfilePhotoURL] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [authUserId]);

  const fetchUserData = async () => {
    try {
      console.log('📅 Fetching user data for:', authUserId);
      
      // First, try to get userSummary data (the proper way)
      const summaryDoc = await getDoc(doc(db, 'userSummaries', authUserId));
      
      if (summaryDoc.exists()) {
        const summaryData = summaryDoc.data() as UserSummary;
        console.log('✅ Found user summary:', summaryData);
        setUserSummary(summaryData);
        
        // Get detailed responses using the responsesByDate mapping
        const responseIds = Object.values(summaryData.responsesByDate || {});
        if (responseIds.length > 0) {
          const detailedResponses: (OpinionResponse & { id: string })[] = [];
          
          // Fetch each response by ID for detailed data
          for (const responseId of responseIds) {
            try {
              const responseDoc = await getDoc(doc(db, 'responses', responseId));
              if (responseDoc.exists()) {
                const responseData = responseDoc.data() as OpinionResponse;
                detailedResponses.push({ ...responseData, id: responseDoc.id });
              }
            } catch (error) {
              console.warn('Could not fetch response:', responseId, error);
            }
          }
          
          console.log('✅ Found detailed responses:', detailedResponses.length);
          setResponses(detailedResponses);
        }
      } else {
        console.log('⚠️ No user summary found, trying fallback method...');
        
        // Fallback: Get anonymous user ID and fetch responses directly
        const anonUserId = localStorage.getItem("anonUserId");
        if (anonUserId) {
          console.log('🔄 Falling back to anonymous user ID:', anonUserId);
          
          const responsesRef = collection(db, 'responses');
          const q = query(responsesRef, where('userId', '==', anonUserId));
          const querySnapshot = await getDocs(q);
          
          const userResponses: (OpinionResponse & { id: string })[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data() as OpinionResponse;
            userResponses.push({ ...data, id: doc.id });
          });
          
          console.log('✅ Found fallback responses:', userResponses.length);
          setResponses(userResponses);
        } else {
          console.log('❌ No anonymous user ID found either');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfilePhoto = async (photoURL: string) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/updateProfilePhoto', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoURL })
      })

      const data = await response.json()
      if (data.success) {
        setProfilePhotoURL(photoURL)
        alert('Profile photo updated successfully!')
      } else {
        throw new Error(data.error || 'Failed to update profile photo')
      }
    } catch (error) {
      console.error('Error updating profile photo:', error)
      alert('Error updating profile photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoURLChange = async () => {
    if (!profilePhotoURL.trim()) return
    
    try {
      setUploading(true)
      await updateProfilePhoto(profilePhotoURL)
    } catch (error) {
      console.error('Error updating photo URL:', error)
    }
  }

  // Get intensity based on response length using OpinionResponse interface
  const getIntensity = (response: OpinionResponse): number => {
    if (!response.reasoning) return 0;
    
    const length = response.reasoning.length;
    if (length === 0) return 0;
    if (length < 50) return 1;
    if (length < 150) return 2;
    if (length < 300) return 3;
    return 4;
  };

  // Get CSS class for intensity
  const getIntensityClass = (intensity: number): string => {
    const classes = [
      'bg-gray-100',
      'bg-green-200',
      'bg-green-300',
      'bg-green-500',
      'bg-green-700'
    ];
    return classes[intensity] || classes[0];
  };

  // Get date from OpinionResponse - opinionId is the date string
  const getDateFromResponse = (response: OpinionResponse): string | null => {
    try {
      // opinionId should be a date string like "2025-01-15"
      if (response.opinionId && typeof response.opinionId === 'string') {
        // Check if it's already in YYYY-MM-DD format
        const dateMatch = response.opinionId.match(/^\d{4}-\d{2}-\d{2}$/);
        if (dateMatch) {
          return response.opinionId;
        }
        
        // Try to parse as a date if it's in a different format
        const parsedDate = new Date(response.opinionId);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      }
      
      // Fallback to timestamp if opinionId doesn't work
      if (response.timestamp) {
        let date: Date | null = null;
        
        if (response.timestamp.seconds) {
          // Firestore Timestamp
          date = new Date(response.timestamp.seconds * 1000);
        } else if (response.timestamp.toDate) {
          // Firestore Timestamp object
          date = response.timestamp.toDate();
        } else if (typeof response.timestamp === 'string') {
          // ISO string
          date = new Date(response.timestamp);
        } else if (response.timestamp instanceof Date) {
          // Already a Date object
          date = response.timestamp;
        }
        
        if (date && !isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing date from response:', error, response);
      return null;
    }
  };

  // Generate calendar data for the last 3 months (most readable)
  const generateCalendarData = () => {
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    
    const days = [];
    const current = new Date(threeMonthsAgo);
    
    // Create a map of date strings to responses for faster lookup
    const responsesByDate = new Map<string, OpinionResponse[]>();
    
    // If we have userSummary, use participationDates for more accurate data
    const participationDates = new Set(userSummary?.participationDates || []);
    const stancesByDate = userSummary?.stancesByDate || {};
    
    responses.forEach(response => {
      const dateStr = getDateFromResponse(response);
      if (dateStr) {
        if (!responsesByDate.has(dateStr)) {
          responsesByDate.set(dateStr, []);
        }
        responsesByDate.get(dateStr)!.push(response);
      }
    });
    
    console.log('📊 Participation dates from userSummary:', Array.from(participationDates));
    console.log('📊 Responses by date:', Array.from(responsesByDate.entries()));
    console.log('📊 Stances by date:', stancesByDate);
    
    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      const dayResponses = responsesByDate.get(dateStr) || [];
      
      // Check if user participated on this date (from userSummary)
      const hasParticipated = participationDates.has(dateStr);
      const stance = stancesByDate[dateStr];
      
      const response = dayResponses.length > 0 ? dayResponses[0] : null;
      const totalIntensity = dayResponses.reduce((sum, r) => 
        sum + getIntensity(r), 0
      );
      
      // If we have userSummary data but no detailed response, show participation
      let intensity = 0;
      if (dayResponses.length > 0) {
        intensity = Math.min(4, Math.max(1, Math.ceil(totalIntensity / dayResponses.length)));
      } else if (hasParticipated) {
        // Show participation even without detailed response data
        intensity = 2; // Medium intensity for participation without details
      }
      
      days.push({
        date: new Date(current),
        dateStr: dateStr,
        response: response,
        allResponses: dayResponses,
        intensity: intensity,
        hasParticipated: hasParticipated,
        stance: stance
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Group days into weeks (starting from Sunday)
  const groupIntoWeeks = () => {
    const weeks: any[][] = [];

    if (calendarData.length === 0) return weeks;

    const firstDay = calendarData[0];
    const startDayOfWeek = firstDay.date.getDay();

    let currentWeek = new Array(startDayOfWeek).fill(null);

    calendarData.forEach((day) => {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });

    // Fill the last week if needed
    while (currentWeek.length < 7 && currentWeek.length > 0) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  };

  // Helper function to get month labels for the calendar
  const getMonthLabels = () => {
    if (calendarData.length === 0) return [];

    const monthLabels: { month: string; weekIndex: number }[] = [];
    let currentMonth = -1;
    
    weeks.forEach((week, index) => {
      const firstDayOfWeek = week.find(day => day !== null);
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.date.getMonth();
        if (month !== currentMonth) {
          monthLabels.push({
            month: firstDayOfWeek.date.toLocaleDateString('en-US', { month: 'short' }),
            weekIndex: index
          });
          currentMonth = month;
        }
      }
    });
    
    return monthLabels;
  };

  // Transpose for GitHub-style display
  const transposeForDisplay = () => {
    const result = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const row = [];
      for (let week = 0; week < weeks.length; week++) {
        row.push(weeks[week] ? weeks[week][dayOfWeek] : null);
      }
      result.push(row);
    }
    return result;
  };

  const calendarData = generateCalendarData();
  const weeks = groupIntoWeeks();
  const monthLabels = getMonthLabels();
  const displayGrid = transposeForDisplay();
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Use userSummary data if available, fallback to responses
  const totalResponses = userSummary?.totalResponses || responses.length;
  const currentStreak = userSummary?.currentStreak || 0;
  const agreeCount = userSummary?.stats.agreeCount || 0;
  const disagreeCount = userSummary?.stats.disagreeCount || 0;
  const averageLength = responses.length > 0 
    ? Math.round(responses.reduce((sum, r) => sum + r.reasoning.length, 0) / responses.length)
    : 0;

  if (loading) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <h4 className="text-lg font-semibold mb-4">📅 Opinion Activity</h4>
        <div className="text-gray-500">Loading your activity...</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h4 className="text-lg font-semibold mb-4">📅 Opinion Activity (Last 3 Months)</h4>
      
      {/* Debug Info */}
      {userSummary && (
        <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded text-xs">
          <strong>✅ User Summary Found:</strong> {userSummary.totalResponses} total opinions, {userSummary.participationDates.length} participation dates <br/>
          <strong>Current Streak:</strong> {userSummary.currentStreak} days <br/>
          <strong>Agree/Disagree:</strong> {userSummary.stats.agreeCount}/{userSummary.stats.disagreeCount} <br/>
          <strong>Last Response:</strong> {userSummary.lastResponse} <br/>
        </div>
      )}

      {!userSummary && responses.length > 0 && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <strong>⚠️ Fallback Mode:</strong> Found {responses.length} responses using anonymous ID. <br/>
          <strong>Issue:</strong> User summary not found - participation tracking may be incomplete. <br/>
          <strong>Calendar:</strong> Showing {calendarData.length} days across {Math.ceil(calendarData.length / 7)} weeks <br/>
        </div>
      )}

      {!userSummary && responses.length === 0 && !loading && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <strong>❌ No data found.</strong> This could be because:
          <ul className="mt-1 ml-4 list-disc">
            <li>You haven't submitted any opinions yet</li>
            <li>User summary data is not being stored properly</li>
            <li>You're using a different browser/device than when you submitted</li>
            <li>Local storage was cleared</li>
          </ul>
        </div>
      )}
      
      {/* Stats */}
      <div className="mb-4 flex flex-wrap gap-6 text-sm text-gray-600">
        <div>
          <strong>{totalResponses}</strong> opinions shared
        </div>
        <div>
          <strong>{currentStreak}</strong> day current streak
        </div>
        <div>
          <strong>{agreeCount}</strong> agree, <strong>{disagreeCount}</strong> disagree
        </div>
        {averageLength > 0 && (
          <div>
            <strong>{averageLength}</strong> avg characters per response
          </div>
        )}
      </div>
      
      {/* Calendar Grid */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 text-xs text-gray-500 mr-2">
            <div className="w-3 h-4"></div> {/* Spacer for month labels */}
            {dayLabels.map((label, index) => (
              <div key={label} className="w-3 h-3 flex items-center text-xs">
                {index % 2 === 1 ? label.slice(0, 1) : ''}
              </div>
            ))}
          </div>
          
          {/* Calendar container with month labels */}
          <div className="relative">
            {/* Month labels */}
            <div className="flex gap-1 mb-1 h-4">
              {monthLabels.map((monthLabel, index) => (
                <div
                  key={`${monthLabel.month}-${index}`}
                  className="text-xs text-gray-600 font-medium"
                  style={{ 
                    position: 'absolute',
                    left: `${monthLabel.weekIndex * 16}px`, // 16px = w-3 (12px) + gap-1 (4px)
                    top: '0px'
                  }}
                >
                  {monthLabel.month}
                </div>
              ))}
            </div>
            
            {/* Calendar squares */}
            <div className="grid grid-rows-7 grid-flow-col gap-1">
              {displayGrid.map((row, rowIndex) => (
                row.map((day, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-3 h-3 rounded-sm border border-gray-200 hover:ring-1 hover:ring-blue-300 cursor-pointer ${
                      day ? getIntensityClass(day.intensity) : 'bg-gray-50'
                    }`}
                    title={day ? `${day.date.toLocaleDateString()}: ${
                      day.hasParticipated
                        ? `Participated (${day.stance || 'unknown stance'})${day.allResponses && day.allResponses.length > 0 ? ` - ${day.allResponses.length} detailed response(s)` : ''}`
                        : 'No participation'
                    }` : ''}
                  />
                ))
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Less active</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded-sm"></div>
          <div className="w-4 h-4 bg-green-200 border border-gray-200 rounded-sm"></div>
          <div className="w-4 h-4 bg-green-300 border border-gray-200 rounded-sm"></div>
          <div className="w-4 h-4 bg-green-500 border border-gray-200 rounded-sm"></div>
          <div className="w-4 h-4 bg-green-700 border border-gray-200 rounded-sm"></div>
        </div>
        <span>More active</span>
      </div>

      {/* Optional Profile Photo Section - Smaller and Less Prominent */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h5 className="text-sm font-medium text-gray-600 mb-3">Profile Photo (Optional)</h5>
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 border-2 border-gray-200">
            <AvatarImage src={profilePhotoURL} alt="Profile" />
            <AvatarFallback className="bg-gray-100 text-gray-600">
              {auth.currentUser?.displayName
                ?.split(" ")
                .map((n) => n[0])
                .join("") || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex gap-2">
              <label htmlFor="profile-photo-url" className="sr-only">
                Profile photo URL
              </label>
              <input
                id="profile-photo-url"
                name="profilePhotoURL"
                type="url"
                value={profilePhotoURL}
                onChange={(e) => setProfilePhotoURL(e.target.value)}
                placeholder="Paste photo URL (optional)"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={uploading}
                aria-describedby="profile-photo-help"
              />
              <Button
                onClick={handlePhotoURLChange}
                disabled={uploading || !profilePhotoURL.trim()}
                variant="outline"
                size="sm"
                aria-label="Save profile photo"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p id="profile-photo-help" className="text-xs text-gray-500 mt-1">
              Add a profile photo if you'd like (completely optional)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main ProfileView Component - THIS IS THE DEFAULT EXPORT
export default function ProfileView() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const authUser: AuthUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        };
        
        setUser(authUser);
        await fetchProfile(currentUser.uid);
      } else {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching profile for:', userId);
      
      const profileDoc = await getDoc(doc(db, 'users', userId));
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data() as UserProfile;
        console.log('✅ Profile found:', profileData);
        setProfile(profileData);
      } else {
        console.log('❌ No profile found - redirecting to create');
        router.push('/create-profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      alert('Error loading profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading your profile...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b-4 border-black mb-6 sm:mb-8 p-4 sm:p-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif tracking-tight">THE DEMOCRACY DAILY</h1>
            <div className="flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-gray-600 border-t border-b border-gray-300 py-2 px-2 sm:px-4 my-2 gap-2 sm:gap-0">
              <span>Vol. 1, No. 1</span>
              <span>{new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric", 
                month: "long",
                day: "numeric",
              })}</span>
              
              {/* Opinion Section Dropdown */}
              <OpinionDropdown sectionName="Profile" currentPage="profile" />
            </div>
            <p className="text-gray-600 mt-2">Profile Management</p>
          </div>
        </div>

        {/* Profile Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold">{profile.displayName}</h2>
                <p className="text-blue-100 text-lg">{profile.email}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm">Member since</p>
                <p className="text-white">
                  {profile.createdAt ? 
                    new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : 
                    'Recently'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Profile Body */}
          <div className="p-6">
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-2xl font-bold">Profile Information</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    Account Details
                  </h4>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Display Name</label>
                    <p className="text-lg text-gray-900">{profile.displayName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-lg text-gray-900">{profile.email}</p>
                  </div>
                </div>

                {/* Account History */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    Account History
                  </h4>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Profile Created</label>
                    <p className="text-lg text-gray-900">
                      {profile.createdAt ? 
                        new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : 
                        'Recently'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-lg text-gray-900">
                      {profile.updatedAt ? 
                        new Date(profile.updatedAt.seconds * 1000).toLocaleDateString() : 
                        'Not updated yet'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Profile Status</label>
                    <p className="text-lg text-gray-900">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        profile.profileComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {profile.profileComplete ? 'Complete' : 'Incomplete'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Friend Requests Section */}
        <div className="mb-8">
          <FriendRequestsManager userId={user.uid} />
        </div>

        {/* Friends Section */}
        <div className="mb-8">
          <FriendsManager userId={user.uid} />
        </div>

        {/* Opinion Activity Calendar */}
        <OpinionCalendar authUserId={user.uid} />

        {/* Navigation Buttons */}
        <div className="mt-8 border-t pt-6">
          <div className="flex justify-center">
            <button 
              onClick={() => router.push('/')}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              🏠 Back to Main Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}