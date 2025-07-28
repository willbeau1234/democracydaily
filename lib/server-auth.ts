import { cookies } from 'next/headers';
import { AuthUser, UserProfile } from './types';

// Firebase Admin SDK types (we'll import these when admin SDK is available)
interface FirebaseUser {
  uid: string;
  email?: string;
  name?: string;
}

// Helper to get authenticated user from server-side
export async function getServerSideUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session');
    
    if (!sessionToken?.value) {
      return null;
    }

    // Verify the session token with Firebase Cloud Function
    const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/verifySession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken.value}`
      }
    });

    const result = await response.json();
    
    if (result.success && result.user) {
      return {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName
      };
    }

    return null;
  } catch (error) {
    console.error('Error verifying server-side session:', error);
    return null;
  }
}

// Get user profile from server-side
export async function getServerSideUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getUserProfile?userId=${userId}`);
    const result = await response.json();
    
    if (result.success && result.profile) {
      return result.profile as UserProfile;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Get user summary/stats from server-side
export async function getServerSideUserSummary(userId: string) {
  try {
    const response = await fetch(`https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getUserSummary?userId=${userId}`);
    const result = await response.json();
    
    if (result.success && result.summary) {
      return result.summary;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user summary:', error);
    return null;
  }
}

// Get friends from server-side
export async function getServerSideFriends(userId: string) {
  try {
    const response = await fetch(`https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getFriends?userId=${userId}`);
    const result = await response.json();
    
    if (result.success) {
      return result.friends || [];
    }

    return [];
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
}

// Get pending friend requests from server-side
export async function getServerSidePendingRequests(userId: string) {
  try {
    const response = await fetch(`https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/getPendingFriendRequests?userId=${userId}`);
    const result = await response.json();
    
    if (result.success) {
      return result.requests || [];
    }

    return [];
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
}