'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { auth } from '@/lib/firebase';

interface OpinionCalendarProps {
  authUserId: string;
  initialUserSummary: any;
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

export default function OpinionCalendar({ authUserId, initialUserSummary }: OpinionCalendarProps) {
  const [userSummary] = useState(initialUserSummary);
  const [profilePhotoURL, setProfilePhotoURL] = useState<string>("");
  const [uploading, setUploading] = useState(false);

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

  // Generate calendar data for the last 3 months (simplified for server-side)
  const generateCalendarData = () => {
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    
    const days = [];
    const current = new Date(threeMonthsAgo);
    
    // If we have userSummary, use participationDates for more accurate data
    const participationDates = new Set(userSummary?.participationDates || []);
    const stancesByDate = userSummary?.stancesByDate || {};
    
    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      
      // Check if user participated on this date (from userSummary)
      const hasParticipated = participationDates.has(dateStr);
      const stance = stancesByDate[dateStr];
      
      // Show participation even without detailed response data
      let intensity = 0;
      if (hasParticipated) {
        intensity = 2; // Medium intensity for participation
      }
      
      days.push({
        date: new Date(current),
        dateStr: dateStr,
        intensity: intensity,
        hasParticipated: hasParticipated,
        stance: stance
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
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

  // Group days into weeks (starting from Sunday)
  const groupIntoWeeks = (calendarData: any[]) => {
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
  const getMonthLabels = (weeks: any[][]) => {
    if (weeks.length === 0) return [];

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
  const transposeForDisplay = (weeks: any[][]) => {
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
  const weeks = groupIntoWeeks(calendarData);
  const monthLabels = getMonthLabels(weeks);
  const displayGrid = transposeForDisplay(weeks);
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Use userSummary data if available
  const totalResponses = userSummary?.totalResponses || 0;
  const currentStreak = userSummary?.currentStreak || 0;
  const agreeCount = userSummary?.stats?.agreeCount || 0;
  const disagreeCount = userSummary?.stats?.disagreeCount || 0;

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h4 className="text-lg font-semibold mb-4">📅 Opinion Activity (Last 3 Months)</h4>
      
      {/* Debug Info */}
      {userSummary && (
        <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded text-xs">
          <strong>✅ User Summary Found:</strong> {userSummary.totalResponses} total opinions, {userSummary.participationDates?.length || 0} participation dates <br/>
          <strong>Current Streak:</strong> {userSummary.currentStreak} days <br/>
          <strong>Agree/Disagree:</strong> {userSummary.stats?.agreeCount}/{userSummary.stats?.disagreeCount} <br/>
          <strong>Last Response:</strong> {userSummary.lastResponse} <br/>
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
                        ? `Participated (${day.stance || 'unknown stance'})`
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