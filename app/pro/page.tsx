'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { AuthUser, UserProfile, OpinionResponse } from '@/lib/types';
import Fire from '@/components/Fire';
import { signOut } from 'firebase/auth';

// GitHub-style Calendar Component
function OpinionCalendar({ userId , onStreakCalculated}: { userId: string; onStreakCalculated?: (streak: number) => void;
  }) {
  const [responses, setResponses] = useState<OpinionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Get anonymous user ID (same logic as your opinion game)
  function getOrCreateUserId() {
    let id = localStorage.getItem("anonUserId");
    if (!id) {
      // If no anonymous ID exists, we can't show calendar data
      return null;
    }
    return id;
  }
  const calculateStreak = (userResponses: OpinionResponse[])=> {
    if (userResponses.length === 0) return 0;
    
    const responseDates = new Set<string>();
    userResponses.forEach(response => {
      const dateStr = getDateFromResponse(response);
      if (dateStr) {
        responseDates.add(dateStr);
      }
    });
    
    const sortedDates = Array.from(responseDates).sort().reverse();
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);

    for(let i = 0; i < 365; i++) {
      const dateStr = toYYYYMMDD(currentDate);
      if (sortedDates.includes(dateStr)) {
        streak++;
      } else {
        if(streak > 0) {
          break;
        }
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  }

  useEffect(() => {
    fetchUserResponses();
  }, [userId]);

  const fetchUserResponses = async () => {
    try {
      console.log('📅 Fetching user responses for calendar...');
      
      // Use the anonymous user ID instead of Firebase auth ID
      const anonUserId = getOrCreateUserId();
      if (!anonUserId) {
        console.log('No anonymous user ID found');
        setLoading(false);
        return;
      }
      
      const responsesRef = collection(db, 'responses');
      const q = query(responsesRef, where('userId', '==', anonUserId));
      const querySnapshot = await getDocs(q);
      
      const userResponses: OpinionResponse[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as OpinionResponse;
        userResponses.push({ ...data, userId: doc.id });
      });
      const streak = calculateStreak(userResponses);
      setCurrentStreak(streak);
      if(onStreakCalculated){
        onStreakCalculated(streak);
      };
      
      console.log('✅ Found responses:', userResponses.length);
      console.log('📋 Sample response data:', userResponses[0]);
      
      setResponses(userResponses);
    } catch (error) {
      console.error('❌ Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Helper to get YYYY-MM-DD string in local timezone
  const toYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
          return toYYYYMMDD(parsedDate);
        }
      }
      
      // Fallback to timestamp if opinionId doesn't work
      if (response.timestamp) {
        let date: Date | null = null;
        
        if (response.timestamp.seconds) {
          date = new Date(response.timestamp.seconds * 1000);
        } else if (response.timestamp.toDate) {
          date = response.timestamp.toDate();
        } else if (typeof response.timestamp === 'string') {
          date = new Date(response.timestamp);
        } else if (response.timestamp instanceof Date) {
          date = response.timestamp;
        }
        
        if (date && !isNaN(date.getTime())) {
          return toYYYYMMDD(date);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing date from response:', error, response);
      return null;
    }
  };

  // Generate calendar data
  const generateCalendarData = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const endDate = new Date(2026, 3, 29); // End of the current year
    
    // Start from the beginning of the current month's first week
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Find the Sunday of the week that contains the first day of the month
    const startDate = new Date(firstDayOfMonth);
    const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    startDate.setDate(startDate.getDate() - dayOfWeek); // Go back to the Sunday
    
    const days = [];
    const current = new Date(startDate);
    
    // Create a map of date strings to responses for faster lookup
    const responsesByDate = new Map<string, OpinionResponse[]>();
    
    responses.forEach(response => {
      const dateStr = getDateFromResponse(response);
      if (dateStr) {
        if (!responsesByDate.has(dateStr)) {
          responsesByDate.set(dateStr, []);
        }
        responsesByDate.get(dateStr)!.push(response);
      }
    });
    
    // Generate days from the aligned start date to the end of the year
    while (current <= endDate) {
      const dateStr = toYYYYMMDD(current);
      const dayResponses = responsesByDate.get(dateStr) || [];
      
      const response = dayResponses.length > 0 ? dayResponses[0] : null;
      const totalIntensity = dayResponses.reduce((sum, r) => 
        sum + getIntensity(r), 0
      );
      
      days.push({
        date: new Date(current),
        dateStr: dateStr,
        response: response,
        allResponses: dayResponses,
        intensity: dayResponses.length > 0 ? Math.min(4, Math.max(1, Math.ceil(totalIntensity / dayResponses.length))) : 0
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Also update the groupIntoWeeks function to be simpler since we're now starting from Sunday
  
  const calendarData = generateCalendarData();
  
  // Group days into weeks (starting from Sunday)
  const groupIntoWeeks = () => {
    const weeks: any[][] = [];
    
    if (calendarData.length === 0) return weeks;
    
    const firstDay = calendarData[0];
    const startDayOfWeek = firstDay.date.getDay();
    
    let currentWeek = new Array(startDayOfWeek).fill(null);
    
    calendarData.forEach((day) => {
      currentWeek.push(day);
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    while (currentWeek.length < 7 && currentWeek.length > 0) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const weeks = groupIntoWeeks();
  
  // The data is already in week-based chunks. For a column-flow grid,
  // we just need to flatten it. Transposing is not necessary here.
  const displayDays = weeks.flat();

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const totalResponses = responses.length;
  const averageLength = responses.length > 0 
    ? Math.round(responses.reduce((sum, r) => sum + r.reasoning.length, 0) / responses.length)
    : 0;

  // Generate month labels
  const monthLabels = React.useMemo(() => {
    if (weeks.length === 0) return [];
    
    const labels: { name: string; startColumn: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      // Find a day in the middle of the week to determine the month
      const dayForMonth = week.find((d, i) => d && i > 2) || week.find(d => d);

      if (dayForMonth) {
        const month = dayForMonth.date.getMonth();
        if (month !== lastMonth) {
          // Check if it's a new month and not too close to the previous label
          if (labels.length === 0 || weekIndex > 2) {
             const lastLabel = labels[labels.length - 1];
             if (!lastLabel || weekIndex > lastLabel.startColumn + 3) {
                labels.push({
                  name: dayForMonth.date.toLocaleString('default', { month: 'short' }),
                  startColumn: weekIndex,
                });
                lastMonth = month;
             }
          }
        }
      }
    });

    return labels;
  }, [weeks]);

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
      <h4 className="text-lg font-semibold mb-4">📅 Opinion Activity</h4>

  
      
      {/* Debug Info */}
    

      {responses.length === 0 && !loading && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <strong>No data found.</strong> This could be because:
          <ul className="mt-1 ml-4 list-disc">
            <li>You haven't submitted any opinions yet</li>
            <li>You're using a different browser/device</li>
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
          <strong>{averageLength}</strong> average characters per response
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex flex-col">
          {/* Month Labels */}
          <div className="flex text-xs text-gray-500" style={{ marginLeft: '22px', marginBottom: '4px' }}>
            {monthLabels.map((month, i) => {
              const prevMonth = monthLabels[i - 1];
              const marginLeft = prevMonth 
                ? (month.startColumn - prevMonth.startColumn) * 16 // 12px width + 4px gap
                : month.startColumn * 16;
              
              return (
                <div key={month.name + month.startColumn} style={{ marginLeft: `${marginLeft}px` }}>
                  {month.name}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 text-xs text-gray-500 mr-2">
              <div className="w-3 h-3"></div>
              {dayLabels.map((label, index) => (
                <div key={label} className="w-3 h-3 flex items-center text-xs">
                  {index % 2 === 1 ? label.slice(0, 1) : ''}
                </div>
              ))}
            </div>
            
            {/* Calendar squares */}
            <div className="grid grid-rows-7 grid-flow-col gap-1">
              {displayDays.map((day, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-sm border border-gray-200 hover:ring-1 hover:ring-blue-300 cursor-pointer ${
                    day ? getIntensityClass(day.intensity) : 'bg-gray-50'
                  }`}
                  title={day ? `${day.date.toLocaleDateString()}: ${
                    day.allResponses && day.allResponses.length > 0
                      ? `${day.allResponses.length} response(s) - ${day.allResponses.map((r: { stance: any; }) => r.stance).join(', ')}`
                      : 'No response'
                  }` : ''}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Less active</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-200 border border-gray-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-300 border border-gray-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-500 border border-gray-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-700 border border-gray-200 rounded-sm"></div>
        </div>
        <span>More active</span>
      </div>
    </div>
  );
}

// Main ProfileView Component - THIS IS THE DEFAULT EXPORT
export default function ProfileView() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userStreak, setUserStreak] = useState(0);

  const router = useRouter();
  const handleStreakCalculated = (streak: number) => {
    setUserStreak(streak);
  };

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
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b-4 border-black mb-8 p-6">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold font-serif tracking-tight">YOUR DEMOCRACY DAILY</h1>
              <p className="text-gray-600 mt-2">Profile Management</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8 p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Your Streak</h2>
          <div className="flex justify-center items-center">
            <div className="flex items-center">
             <div className="-ml-11"><Fire /></div>
              <div className="text-6xl font-bold text-black -ml-7">{userStreak}</div>
            </div>
          </div>
        </div>
  
        {/* Opinion Activity Calendar */}
        <OpinionCalendar userId="anonymous" onStreakCalculated={handleStreakCalculated} />
  
        {/* Profile Content - Moved below calendar */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8 mt-8">
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
  
        {/* Navigation Buttons */}
        <div className="mt-8 border-t pt-6">
          <div className="flex justify-center">
            <button 
              onClick={() => router.push('/')}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              🏠 Back to Main Page
            </button>
            <button 
              onClick={async () => {
                try {
                  await signOut(auth);
                  console.log('✅ User signed out successfully');
                  router.push('/');
                } catch (error) {
                  console.error('❌ Error signing out:', error);
                }
              }}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}