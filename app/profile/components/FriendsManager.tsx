'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, X, Users, Bell, UserCheck } from "lucide-react";
import { auth } from '@/lib/firebase';

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

interface FriendsManagerProps {
  userId: string;
  initialFriends: Friend[];
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

export default function FriendsManager({ userId, initialFriends }: FriendsManagerProps) {
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [nudging, setNudging] = useState<string | null>(null);

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