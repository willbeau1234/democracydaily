import { AuthUser, UserProfile } from './types';

// Temporary fallback - return null to force client-side auth
// This will redirect users to login on client-side
export async function getServerSideUser(): Promise<AuthUser | null> {
  // For now, return null to force client-side authentication
  // This means the profile page will redirect to home page on server-side
  // but will work properly once client-side auth kicks in
  return null;
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