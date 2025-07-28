'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, X, Users } from "lucide-react";
import { auth } from '@/lib/firebase';

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

interface FriendRequestsManagerProps {
  userId: string;
  initialRequests: FriendRequest[];
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

export default function FriendRequestsManager({ userId, initialRequests }: FriendRequestsManagerProps) {
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>(initialRequests);
  const [responding, setResponding] = useState<string | null>(null);

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