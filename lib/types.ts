// Firebase Auth User
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// User Profile
export interface UserProfile {
  displayName: string;
  email: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  profileComplete: boolean;
}

// Opinion Response (for daily opinions)
export interface OpinionResponse {
  userId: string;
  opinionId: string;
  stance: 'agree' | 'disagree';
  reasoning: string;
  timestamp: any; // Firestore Timestamp or Date
} 