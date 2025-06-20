// types/index.ts or lib/types.ts

// 🔐 Auth User Interface (for authentication only)
export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
  }
  
  // 👤 User Profile Interface
  export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    createdAt: any;           // Firebase timestamp
    updatedAt: any;           // Firebase timestamp
    profileComplete: boolean;
    
    // Optional stats (calculated from responses)
    opinionStats?: {
      totalOpinions: number;
      averageLength: number;
      longestResponse: number;
      lastOpinionDate: string;
      currentStreak: number;
    };
  }
  
  // 💭 Opinion Response Interface  
  export interface OpinionResponse {
    userId: string;           // WHO wrote it
    opinionId: string;        // WHICH question (date: "2025-01-15")
    stance: 'agree' | 'disagree'; // WHAT they chose
    reasoning: string;        // WHY they chose it
    timestamp: any;           // WHEN they submitted
    characterCount: number;   // HOW long their response was
  }
  
  // 📊 Opinion Stats Interface (if you want to separate it)
  export interface OpinionStats {
    totalOpinions: number;
    averageLength: number;
    longestResponse: number;
    lastOpinionDate: string;
    currentStreak: number;
  }