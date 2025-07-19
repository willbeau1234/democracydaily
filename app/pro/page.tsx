  'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { AuthUser, UserProfile, OpinionResponse } from '@/lib/types';

// GitHub-style Calendar Component
function OpinionCalendar({ userId }: { userId: string }) {
  const [responses, setResponses] = useState<OpinionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Get anonymous user ID (same logic as your opinion game)
  function getOrCreateUserId() {
    let id = localStorage.getItem("anonUserId");
    if (!id) {
      // If no anonymous ID exists, we can't show calendar data
      return null;
    }
    return id;
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
      
      const userResponses: (OpinionResponse & { id: string })[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as OpinionResponse;
        userResponses.push({ ...data, id: doc.id });
      });
      
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
    
    responses.forEach(response => {
      const dateStr = getDateFromResponse(response);
      if (dateStr) {
        if (!responsesByDate.has(dateStr)) {
          responsesByDate.set(dateStr, []);
        }
        responsesByDate.get(dateStr)!.push(response);
      }
    });
    
    console.log('📊 Responses by date:', Array.from(responsesByDate.entries()));
    
    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
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

    const monthLabels: { month: any; weekIndex: number; }[] = [];
    let currentMonth = -1;
    let weekIndex = 0;

    // Group calendar data into weeks first
    const weekData = groupIntoWeeks();
  
  // Helper function to get month labels
  const getCalendarMonthLabels = () => {
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

  const calendarData = generateCalendarData();
  const weeks = groupIntoWeeks();
  
  // Helper function to get month labels
  const getCalendarMonthLabels = () => {
    const monthLabels: { month: any; weekIndex: number; }[] = [];
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
  const monthLabels = getMonthLabels();
  const weeksData = groupIntoWeeks();
  
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

  const displayGrid = transposeForDisplay();
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const totalResponses = responses.length;
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
      {responses.length > 0 && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <strong>Debug Info:</strong> Found {responses.length} responses using anonymous user ID. <br/>
          <strong>Calendar:</strong> Showing {calendarData.length} days across {Math.ceil(calendarData.length / 7)} weeks <br/>
          <strong>Sample opinionId:</strong> {responses[0]?.opinionId || 'none'} <br/>
          <strong>Sample stance:</strong> {responses[0]?.stance || 'none'} <br/>
          <strong>Sample reasoning length:</strong> {responses[0]?.reasoning?.length || 0} characters <br/>
        </div>
      )}

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
                      day.allResponses && day.allResponses.length > 0
                        ? `${day.allResponses.length} response(s) - ${day.allResponses.map(r => r.stance).join(', ')}`
                        : 'No response'
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

        {/* Opinion Activity Calendar */}
        <OpinionCalendar userId="anonymous" />

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