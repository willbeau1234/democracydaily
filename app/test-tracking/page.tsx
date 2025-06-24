'use client';

import React, { useState, useEffect } from 'react';
import { getUserStreak, recordUserParticipation } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Get anonymous user ID (same logic as your opinion game)
function getOrCreateUserId() {
  let id = localStorage.getItem("anonUserId");
  if (!id) {
    // If no anonymous ID exists, we can't show calendar data
    return null;
  }
  return id;
}

export default function TestTrackingPage() {
  const [streakData, setStreakData] = useState<any>(null);
  const [userResponses, setUserResponses] = useState<any[]>([]);
  const [diyVotes, setDiyVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get user ID
      const userId = getOrCreateUserId();
      console.log('🔍 Testing with user ID:', userId);
      
      // Get current streak data
      const streak = getUserStreak();
      setStreakData(streak);
      
      // Fetch user responses from daily opinions
      const responsesRef = collection(db, 'responses');
      const responsesQuery = query(responsesRef, where('userId', '==', userId));
      const responsesSnapshot = await getDocs(responsesQuery);
      
      const responses: any[] = [];
      responsesSnapshot.forEach((doc) => {
        responses.push({ id: doc.id, ...doc.data() });
      });
      setUserResponses(responses);
      
      // Fetch DIY votes
      const votesRef = collection(db, 'diy_votes');
      const votesQuery = query(votesRef, where('userId', '==', userId));
      const votesSnapshot = await getDocs(votesQuery);
      
      const votes: any[] = [];
      votesSnapshot.forEach((doc) => {
        votes.push({ id: doc.id, ...doc.data() });
      });
      setDiyVotes(votes);
      
      console.log('📊 Test Results:', {
        userId,
        streak,
        dailyResponses: responses.length,
        diyVotes: votes.length,
        totalActivity: responses.length + votes.length
      });
      
    } catch (error) {
      console.error('❌ Error loading test data:', error);
    } finally {
      setLoading(false);
    }
  };

  const testParticipationRecording = async () => {
    try {
      setTestResult('Recording participation...');
      
      const beforeStreak = getUserStreak();
      console.log('🔥 Streak before:', beforeStreak);
      
      const newStreak = await recordUserParticipation();
      console.log('🔥 Streak after:', newStreak);
      
      setStreakData(newStreak);
      setTestResult(`✅ Participation recorded! Streak: ${beforeStreak.currentStreak} → ${newStreak.currentStreak}`);
      
      // Reload data to show updated counts
      setTimeout(loadUserData, 1000);
      
    } catch (error) {
      console.error('❌ Error testing participation:', error);
      setTestResult(`❌ Error: ${error}`);
    }
  };

  const calculateWordStats = () => {
    const allText = [
      ...userResponses.map(r => r.reasoning || ''),
      ...diyVotes.map(v => v.comment || '')
    ].filter(text => text.length > 0).join(' ');
    
    const wordCount = allText.split(/\s+/).length;
    const charCount = allText.length;
    
    return { wordCount, charCount, allText };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading test data...</div>
      </div>
    );
  }

  const wordStats = calculateWordStats();

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-6">🧪 User Tracking Test</h1>
          
          {/* Test Controls */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            <button 
              onClick={testParticipationRecording}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              🧪 Test: Record Participation
            </button>
            <button 
              onClick={loadUserData}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors ml-4"
            >
              🔄 Refresh Data
            </button>
            {testResult && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                <strong>Test Result:</strong> {testResult}
              </div>
            )}
          </div>

          {/* User ID Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">👤 User Identification</h2>
            <p><strong>Anonymous User ID:</strong> {getOrCreateUserId()}</p>
            <p><strong>User ID Type:</strong> Anonymous (localStorage-based)</p>
          </div>

          {/* Streak Data */}
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">🔥 Streak Tracking</h2>
            {streakData ? (
              <><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <strong>Current Streak:</strong>
                  <div className="text-2xl font-bold text-orange-600">{streakData.currentStreak}</div>
                </div>
                <div>
                  <strong>Longest Streak:</strong>
                  <div className="text-2xl font-bold text-green-600">{streakData.longestStreak}</div>
                </div>
                <div>
                  <strong>Total Participations:</strong>
                  <div className="text-2xl font-bold text-blue-600">{streakData.totalParticipations}</div>
                </div>
                <div>
                  <strong>Last Participation:</strong>
                  <div className="text-sm">{streakData.lastParticipationDate || 'Never'}</div>
                </div>
              </div><div className="mt-4">
                  <strong>Participation Dates:</strong>
                  <div className="text-sm text-gray-600 mt-2">
                    {streakData.participationDates.length > 0
                      ? streakData.participationDates.slice(-10).join(', ')
                      : 'No participation recorded'}
                  </div>
                </div></>
            ) : (
              <p>No streak data found</p>
            )}
          </div>

          {/* Response Data */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">📝 Response Tracking</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <strong>Daily Opinion Responses:</strong>
                <div className="text-2xl font-bold text-green-600">{userResponses.length}</div>
              </div>
              <div>
                <strong>DIY Votes:</strong>
                <div className="text-2xl font-bold text-blue-600">{diyVotes.length}</div>
              </div>
              <div>
                <strong>Total Activity:</strong>
                <div className="text-2xl font-bold text-purple-600">{userResponses.length + diyVotes.length}</div>
              </div>
            </div>
          </div>

          {/* Word Count Stats */}
          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">📊 Word Count Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Total Words Written:</strong>
                <div className="text-2xl font-bold text-purple-600">{wordStats.wordCount}</div>
              </div>
              <div>
                <strong>Total Characters:</strong>
                <div className="text-2xl font-bold text-indigo-600">{wordStats.charCount}</div>
              </div>
            </div>
            {wordStats.allText && (
              <div className="mt-4">
                <strong>Sample Text (first 200 chars):</strong>
                <div className="text-sm text-gray-600 mt-2 p-3 bg-white rounded border">
                  {wordStats.allText.substring(0, 200)}...
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">🕒 Recent Activity</h2>
            <div className="space-y-2">
              {userResponses.slice(0, 3).map((response, index) => (
                <div key={index} className="p-3 bg-white rounded border">
                  <div className="flex justify-between">
                    <span><strong>Daily Response:</strong> {response.stance}</span>
                    <span className="text-sm text-gray-500">
                      {response.timestamp?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {response.reasoning?.substring(0, 100)}...
                  </div>
                </div>
              ))}
              {diyVotes.slice(0, 3).map((vote, index) => (
                <div key={index} className="p-3 bg-white rounded border">
                  <div className="flex justify-between">
                    <span><strong>DIY Vote:</strong> {vote.vote}</span>
                    <span className="text-sm text-gray-500">
                      {vote.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {vote.comment?.substring(0, 100)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 