'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

// GitHub-style Calendar Component
interface OpinionResponse {
  opinionId: string;
  reasoning: string;
  stance: string;
  createdAt: any;
}

const OpinionCalendar: React.FC<{ userId: string }> = ({ userId }) => {
  const [responses, setResponses] = useState<OpinionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserResponses();
  }, [userId]);

  const fetchUserResponses = async () => {
    try {
      console.log('📅 Fetching user responses for calendar...');
      
      const responsesRef = collection(db, 'responses');
      const q = query(responsesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const userResponses: OpinionResponse[] = [];
      querySnapshot.forEach((doc) => {
        userResponses.push(doc.data() as OpinionResponse);
      });
      
      console.log('✅ Found responses:', userResponses.length);
      setResponses(userResponses);
    } catch (error) {
      console.error('❌ Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get intensity based on response length
  const getIntensity = (reasoning: string): number => {
    const length = reasoning.length;
    if (length === 0) return 0;
    if (length < 50) return 1;   // Light green
    if (length < 150) return 2;  // Medium green
    if (length < 300) return 3;  // Dark green
    return 4;                    // Very dark green
  };

  // Get CSS class for intensity
  const getIntensityClass = (intensity: number): string => {
    const classes = [
      'bg-gray-100',           // 0 - No response
      'bg-green-200',          // 1 - Light green
      'bg-green-300',          // 2 - Medium green  
      'bg-green-500',          // 3 - Dark green
      'bg-green-700'           // 4 - Very dark green
    ];
    return classes[intensity] || classes[0];
  };

  // Generate calendar data for the last 12 months
  const generateCalendarData = () => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    const days = [];
    const current = new Date(oneYearAgo);
    
    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      const response = responses.find(r => r.opinionId === dateStr);
      
      days.push({
        date: new Date(current),
        dateStr: dateStr,
        response: response,
        intensity: response ? getIntensity(response.reasoning) : 0
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const calendarData = generateCalendarData();
  
  // Group days into weeks (starting from Sunday) - proper GitHub style
  const groupIntoWeeks = () => {
    const weeks: any[][] = [];
    
    // Start from the first Sunday of the year or pad with empty days
    const firstDay = calendarData[0];
    const startDayOfWeek = firstDay.date.getDay();
    
    // Add empty days to align with Sunday start
    let currentWeek = new Array(startDayOfWeek).fill(null);
    
    calendarData.forEach((day) => {
      currentWeek.push(day);
      
      // If we've filled a week (7 days), start a new one
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Fill the last week with nulls if needed
    while (currentWeek.length < 7 && currentWeek.length > 0) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const weeks = groupIntoWeeks();
  
  // Transpose weeks to show in GitHub style (weeks as columns, days as rows)
  const transposeForDisplay = () => {
    const result = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const row = [];
      for (let week = 0; week < weeks.length; week++) {
        row.push(weeks[week][dayOfWeek]);
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
      <h4 className="text-lg font-semibold mb-4">📅 Opinion Activity (Last 12 Months)</h4>
      
      {/* Stats */}
      <div className="mb-4 flex flex-wrap gap-6 text-sm text-gray-600">
        <div>
          <strong>{totalResponses}</strong> opinions shared
        </div>
        <div>
          <strong>{averageLength}</strong> average characters per response
        </div>
      </div>
      
      {/* Calendar Grid - GitHub Style */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 text-xs text-gray-500 mr-2">
            <div className="w-3 h-3"></div> {/* Spacer for alignment */}
            {dayLabels.map((label, index) => (
              <div key={label} className="w-3 h-3 flex items-center text-xs">
                {index % 2 === 1 ? label.slice(0, 1) : ''}
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
                    day.response 
                      ? `"${day.response.stance}" - ${day.response.reasoning.length} characters`
                      : 'No response'
                  }` : ''}
                />
              ))
            ))}
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
};

// Define the simplified profile type
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt?: any;
  updatedAt?: any;
  profileComplete?: boolean;
}

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export default function ProfileView() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // Check auth and fetch profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchProfile(currentUser.uid);
      } else {
        // Not signed in, redirect to main page
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch user profile from Firestore
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading your profile...</div>
      </div>
    );
  }

  // No user or profile
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

          {/* Profile Body - Simple View Only */}
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

                {/* Dates Info */}
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
        {user && <OpinionCalendar userId={user.uid} />}

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