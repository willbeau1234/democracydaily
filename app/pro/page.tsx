'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Fire from '@/components/Fire';
import { signOut } from 'firebase/auth';

// Define types
interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface UserProfile {
  displayName: string;
  email: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  profileComplete: boolean;
}

interface UserSummary {
  userId: string;
  totalResponses: number;
  firstResponse: string;
  lastResponse: string;
  lastResponseTime: string;
  responsesByDate: Record<string, string>; // opinionId -> responseId
  stats: {
    agreeCount: number;
    disagreeCount: number;
    avgCharacterCount?: number;
  };
  participationDates: string[]; // Array of date strings (opinionIds)
  currentStreak: number;
  createdAt: any;
  updatedAt: any;
}

// Enhanced Calendar Component with extensive debugging
function OpinionCalendar({ userId, onStreakCalculated }: { userId: string; onStreakCalculated?: (streak: number) => void; }) {
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    fetchUserSummary();
  }, [userId]);

  const fetchUserSummary = async () => {
    try {
      console.log('🚀 STARTING fetchUserSummary...');
      console.log('📋 User ID provided:', userId);
      
      setError(null);
      setLoading(true);
      
      if (!userId) {
        console.log('❌ No user ID provided');
        setError('No user ID provided');
        setLoading(false);
        return;
      }
      
      console.log('🔍 Fetching document: userSummaries/' + userId);
      
      // Try to fetch the userSummaries document
      const summaryDoc = await getDoc(doc(db, 'userSummaries', userId));
      
      console.log('📄 Document exists:', summaryDoc.exists());
      
      if (summaryDoc.exists()) {
        const summaryData = summaryDoc.data();
        console.log('✅ Raw document data:', summaryData);
        
        // Validate the data structure
        const isValidData = summaryData && 
          typeof summaryData.totalResponses === 'number' &&
          Array.isArray(summaryData.participationDates) &&
          typeof summaryData.currentStreak === 'number';
        
        console.log('📊 Data validation passed:', isValidData);
        
        if (isValidData) {
          // Fetch individual response stances using responsesByDate mapping
          const responseStances: Record<string, string> = {};
          
          if (summaryData.responsesByDate) {
            console.log('🔍 Fetching individual response stances...');
            
            for (const [opinionId, responseId] of Object.entries(summaryData.responsesByDate)) {
              try {
                const responseDoc = await getDoc(doc(db, 'responses', responseId as string));
                if (responseDoc.exists()) {
                  const responseData = responseDoc.data();
                  responseStances[opinionId] = responseData.stance;
                  console.log(`📊 ${opinionId}: ${responseData.stance}`);
                }
              } catch (err) {
                console.log(`⚠️ Could not fetch response ${responseId}:`, err);
              }
            }
          }
          
          // Add stance data to summary
          const enhancedSummary = {
            ...summaryData,
            stancesByDate: responseStances
          };
          
          setUserSummary(enhancedSummary as UserSummary & { stancesByDate: Record<string, string> });
          console.log('🔥 Setting streak to:', summaryData.currentStreak);
          
          if (onStreakCalculated) {
            onStreakCalculated(summaryData.currentStreak);
          }
          
          setDebugInfo({
            documentExists: true,
            totalResponses: summaryData.totalResponses,
            participationDates: summaryData.participationDates,
            currentStreak: summaryData.currentStreak,
            stats: summaryData.stats,
            stancesByDate: responseStances
          });
        } else {
          console.log('❌ Invalid data structure:', summaryData);
          setError('Invalid user summary data structure');
        }
      } else {
        console.log('❌ No userSummaries document found for user:', userId);
        setError('No user activity data found. Submit your first opinion to start tracking!');
        setUserSummary(null);
        
        setDebugInfo({
          documentExists: false,
          message: 'No userSummaries document found'
        });
        
        if (onStreakCalculated) {
          onStreakCalculated(0);
        }
      }
      
    } catch (error) {
      console.error('💥 Error fetching user summary:', error);
      setError(`Failed to load activity data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      });
      
      if (onStreakCalculated) {
        onStreakCalculated(0);
      }
    } finally {
      setLoading(false);
      console.log('🏁 fetchUserSummary completed');
    }
  };

  // Helper to get YYYY-MM-DD string in local timezone
  const toYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generate calendar data from user summary
  const generateCalendarData = (summary: (UserSummary & { stancesByDate?: Record<string, string> }) | null) => {
    console.log('🗓️ Generating calendar data for summary:', summary);
    
    const today = new Date();
    const endDate = new Date(2026, 3, 29);
    
    // Start from the beginning of the current month's first week
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = new Date(firstDayOfMonth);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);
    
    const days = [];
    const current = new Date(startDate);
    
    // Create a set of participation dates for faster lookup
    const participationDatesSet = new Set(summary?.participationDates || []);
    const stancesByDate = summary?.stancesByDate || {};
    console.log('🎯 Participation dates set:', participationDatesSet);
    console.log('🎯 Stances by date:', stancesByDate);
    
    // Generate days
    while (current <= endDate) {
      const dateStr = toYYYYMMDD(current);
      const hasParticipated = participationDatesSet.has(dateStr);
      const stance = stancesByDate[dateStr] || null;
      
      days.push({
        date: new Date(current),
        dateStr: dateStr,
        hasParticipated: hasParticipated,
        stance: stance,
        intensity: hasParticipated ? 1 : 0
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    console.log('📅 Generated', days.length, 'calendar days');
    return days;
  };

  // Get CSS class based on stance
  const getIntensityClass = (day: any): string => {
    if (!day || !day.hasParticipated) {
      return 'bg-gray-100'; // No participation
    }
    
    if (day.stance === 'agree') {
      return 'bg-green-500'; // Green for agree
    } else if (day.stance === 'disagree') {
      return 'bg-red-500'; // Red for disagree
    } else {
      return 'bg-blue-300'; // Fallback blue if stance is unknown
    }
  };

  // Group days into weeks
  const groupIntoWeeks = (calendarData: any[]) => {
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

  const calendarData = generateCalendarData(userSummary);
  const weeks = groupIntoWeeks(calendarData);
  const displayDays = weeks.flat();

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate month labels
  const monthLabels = React.useMemo(() => {
    if (weeks.length === 0) return [];
    
    const labels: { name: string; startColumn: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const dayForMonth = week.find((d, i) => d && i > 2) || week.find(d => d);

      if (dayForMonth) {
        const month = dayForMonth.date.getMonth();
        if (month !== lastMonth) {
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
        <div className="text-xs text-gray-400 mt-2">Fetching data from userSummaries/{userId}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <h4 className="text-lg font-semibold mb-4">📅 Opinion Activity</h4>
        <div className="text-red-600 mb-4">{error}</div>
        
        {/* Debug Information */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
        
        <button 
          onClick={fetchUserSummary}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!userSummary) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <h4 className="text-lg font-semibold mb-4">📅 Opinion Activity</h4>
        <div className="text-gray-500 mb-4">
          No activity data found. Submit your first opinion response to start tracking your activity!
        </div>
        
        {/* Debug Information */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h4 className="text-lg font-semibold mb-4">📅 Opinion Activity</h4>

      {/* Stats from UserSummary */}
      <div className="mb-4 flex flex-wrap gap-6 text-sm text-gray-600">
        <div>
          <strong>{userSummary.totalResponses}</strong> opinions shared
        </div>
        <div>
          <strong>{userSummary.stats.agreeCount}</strong> agree responses
        </div>
        <div>
          <strong>{userSummary.stats.disagreeCount}</strong> disagree responses
        </div>
        <div>
          <strong>{userSummary.currentStreak}</strong> day streak
        </div>
      </div>
      
      {/* Debug info in development */}
      <details className="text-xs text-gray-400 mb-4">
        <summary className="cursor-pointer">Debug Info</summary>
        <div className="mt-2">
          <div>Participation dates: {userSummary.participationDates.join(', ')}</div>
          <div>Stances by date: {JSON.stringify((userSummary as any).stancesByDate || {})}</div>
          <div>Calendar days with activity: {calendarData.filter(d => d.hasParticipated).length}</div>
          <div>Green (agree) days: {calendarData.filter(d => d.stance === 'agree').length}</div>
          <div>Red (disagree) days: {calendarData.filter(d => d.stance === 'disagree').length}</div>
        </div>
      </details>
      
      {/* Calendar Grid */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex flex-col">
          {/* Month Labels */}
          <div className="flex text-xs text-gray-500" style={{ marginLeft: '22px', marginBottom: '4px' }}>
            {monthLabels.map((month, i) => {
              const prevMonth = monthLabels[i - 1];
              const marginLeft = prevMonth 
                ? (month.startColumn - prevMonth.startColumn) * 16
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
                    day ? getIntensityClass(day) : 'bg-gray-50'
                  }`}
                  title={day ? `${day.date.toLocaleDateString()}: ${
                    day.hasParticipated ? `${day.stance} stance` : 'No response'
                  }` : ''}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>No activity</span>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded-sm"></div>
            <span>None</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 border border-gray-200 rounded-sm"></div>
            <span>Agree</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 border border-gray-200 rounded-sm"></div>
            <span>Disagree</span>
          </div>
        </div>
        <span>Activity</span>
      </div>
    </div>
  );
}

// Main ProfileView Component
export default function ProfileView() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userStreak, setUserStreak] = useState(0);

  const router = useRouter();
  const handleStreakCalculated = (streak: number) => {
    console.log('🔥 Streak calculated in ProfileView:', streak);
    setUserStreak(streak);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('👤 Auth state changed:', currentUser ? 'User logged in' : 'No user');
      
      if (currentUser) {
        const authUser: AuthUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        };
        
        console.log('👤 Auth user object:', authUser);
        setUser(authUser);
        await fetchProfile(currentUser.uid);
      } else {
        console.log('🚪 No user, redirecting to home');
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
        
        {/* Streak Display */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8 p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Your Streak</h2>
          <div className="flex justify-center items-center">
            <div className="flex items-center">
             <div className="-ml-11"><Fire /></div>
              <div className="text-6xl font-bold text-black -ml-7">{userStreak}</div>
            </div>
          </div>
        </div>
        
        {/* Opinion Activity Calendar - With extensive debugging */}
        <OpinionCalendar userId={user.uid} onStreakCalculated={handleStreakCalculated} />
  
        {/* Profile Content */}
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
          <div className="flex justify-center gap-4">
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