"use client" // Tells Next.js this is a client-side component

import { useState, useCallback, useMemo, use, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import KaraokeText from "@/components/karaoke-text"
import { Share2, Copy } from "lucide-react"
import { FaFacebook } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6"; 
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from "uuid";
import { getTodayOpinion, getOpinionStats, OpinionStats, getUserResponse } from "@/lib/firebase";
import { collection, addDoc } from 'firebase/firestore';
import { query, where, getDocs } from 'firebase/firestore';
import TypewriterAnimation from '@/components/TypewriterAnimation';
import Blur from '@/components/Blur';
import { GoogleAuthProvider, signInWithPopup, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthUser , OpinionResponse } from '@/lib/types';
import AIvsHumanButton from '@/components/AIvsHumanButton';
import { useRealTimeStats, useRealTimeWordCloud, useRealTimeVotes } from '@/hooks/useFirebase'
import OpinionDropdown from "@/components/OpinionDropdown"





// Dynamic Word Cloud Component
interface DynamicWordCloudProps {
  opinionId: string;
  stance: 'agree' | 'disagree';
} 

const DynamicWordCloud: React.FC<DynamicWordCloudProps> = ({ opinionId, stance }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { wordData, loading, responseCount } = useRealTimeWordCloud(opinionId, stance);

  // Spatial Hash Grid for collision detection
  class SpatialHashGrid {
    cellSize: number;
    grid: Map<string, any[]>;

    constructor(cellSize: number) {
      this.cellSize = cellSize;
      this.grid = new Map();
    }

    addWord(word: any) {
      const cells = this.getCells(word);
      cells.forEach(cell => {
        const key = `${cell.x},${cell.y}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(word);
      });
    }

    getCells(word: any) {
      const cells = [];
      const startX = Math.floor(word.x / this.cellSize);
      const endX = Math.floor((word.x + word.width) / this.cellSize);
      const startY = Math.floor(word.y / this.cellSize);
      const endY = Math.floor((word.y + word.height) / this.cellSize);

      for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
          cells.push({ x, y });
        }
      }
      return cells;
    }

    query(word: any) {
      const cells = this.getCells(word);
      const candidates = new Set();
      cells.forEach(cell => {
        const key = `${cell.x},${cell.y}`;
        const cellWords = this.grid.get(key) || [];
        cellWords.forEach(w => candidates.add(w));
      });
      return Array.from(candidates);
    }
  }

  // Collision detection
  const hasCollision = (word: any, otherWords: any[], padding = 8) => {
    for (const other of otherWords) {
      if (word.x < other.x + other.width + padding &&
          word.x + word.width + padding > other.x &&
          word.y < other.y + other.height + padding &&
          word.y + word.height + padding > other.y) {
        return true;
      }
    }
    return false;
  };

  // Archimedean spiral
  const archimedeanSpiral = (width: number, height: number) => {
    const e = width / height;
    return function(t: number) {
      const angle = 0.1 * t;
      const radius = 2 * Math.sqrt(t);
      return [
        e * radius * Math.cos(angle),
        radius * Math.sin(angle)
      ];
    };
  };

  // Color palette
  const getColorPalette = () => [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
    "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5"
  ];

  // Generate word cloud on canvas
  const generateWordCloud = (words: [string, number][]) => {
    const canvas = canvasRef.current;
    if (!canvas || !words.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Setup
    const frequencies = words.map(([, freq]) => freq);
    const maxFreq = Math.max(...frequencies);
    const minFreq = Math.min(...frequencies);
    
    const colors = getColorPalette();
    const centerX = width / 2;
    const centerY = height / 2;
    const placedWords: any[] = [];
    const collisionGrid = new SpatialHashGrid(40);
    const spiral = archimedeanSpiral(width, height);

    // Place words
    for (let i = 0; i < Math.min(40, words.length); i++) {
      const [word, frequency] = words[i];
      
      // Calculate font size with smooth scaling
      const sizeRatio = Math.pow((frequency - minFreq) / (maxFreq - minFreq || 1), 0.6);
      const fontSize = Math.round(12 + sizeRatio * 32);
      
      ctx.font = `${fontSize > 20 ? 'bold' : 'normal'} ${fontSize}px Arial, sans-serif`;
      const metrics = ctx.measureText(word);
      const wordWidth = metrics.width;
      const wordHeight = fontSize;

      let placed = false;
      let attempts = 0;
      const maxAttempts = 300;

      while (!placed && attempts < maxAttempts) {
        let pos;

        if (i === 0) {
          // Center the largest word
          pos = {
            x: centerX - wordWidth / 2,
            y: centerY - wordHeight / 2
          };
        } else {
          // Use spiral for other words
          const [spiralX, spiralY] = spiral(attempts * 2);
          pos = {
            x: centerX + spiralX - wordWidth / 2,
            y: centerY + spiralY - wordHeight / 2
          };
        }

        // Check bounds
        if (pos.x >= 5 && pos.x + wordWidth <= width - 5 &&
            pos.y >= 5 && pos.y + wordHeight <= height - 5) {
          
          const wordObj = {
            x: pos.x,
            y: pos.y,
            width: wordWidth,
            height: wordHeight,
            text: word,
            fontSize: fontSize,
            color: colors[i % colors.length]
          };

          // Check collision
          const candidates = collisionGrid.query(wordObj);
          if (!hasCollision(wordObj, candidates, 4)) {
            placedWords.push(wordObj);
            collisionGrid.addWord(wordObj);
            placed = true;
          }
        }

        attempts++;
      }
    }

    // Render words with animation
    placedWords.forEach((wordObj, index) => {
      setTimeout(() => {
        ctx.fillStyle = wordObj.color;
        ctx.font = `${wordObj.fontSize > 20 ? 'bold' : 'normal'} ${wordObj.fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const centerWordX = wordObj.x + wordObj.width / 2;
        const centerWordY = wordObj.y + wordObj.height / 2;
        
        // Slight rotation for some words
        const shouldRotate = Math.random() < 0.1 && wordObj.fontSize < 25;
        
        if (shouldRotate) {
          ctx.save();
          ctx.translate(centerWordX, centerWordY);
          ctx.rotate((Math.random() - 0.5) * 0.3);
          ctx.fillText(wordObj.text, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(wordObj.text, centerWordX, centerWordY);
        }
      }, index * 30); // Staggered animation
    });
  };

  // Re-generate word cloud when data changes
  useEffect(() => {
    if (wordData.length > 0) {
      generateWordCloud(wordData);
    }
  }, [wordData]);

  return (
    <div className="border rounded-lg p-3 sm:p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-serif text-base sm:text-lg font-semibold">
          {stance === 'agree' ? '✅ Agree' : '❌ Disagree'} Word Cloud
        </h4>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
          <span className="text-xs text-gray-600">
            {loading ? 'Updating...' : 'Live'}
          </span>
        </div>
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={250}
          className="w-full h-auto border border-gray-200 rounded max-w-full"
          style={{ maxWidth: '100%', height: 'auto', minHeight: '200px' }}
        />
        
        {wordData.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500 text-sm">No responses yet!</p>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-600 text-center">
        <p>📊 {responseCount} {responseCount === 1 ? 'response' : 'responses'}</p>
      </div>
    </div>
  );
};

export default function OpinionGame() {
  const [selectedOption, setSelectedOption] = useState<"agree" | "disagree" | null>(null)
  const [gaveOption, setGaveOption] = useState(false)
  const [reasoning, setReasoning] = useState("")
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [karaokeSpeed, setKaraokeSpeed] = useState(1)
  const [shouldSkip, setShouldSkip] = useState(false)
  const [opinionPiece, setOpinionPiece] = useState("")
  const [loadingOpinion, setLoadingOpinion] = useState(true)
  const [isFeedbackSent, setIsFeedbackSent] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);
  const [user, setUser] =   useState<AuthUser | null>(null);
  const [userOriginalResponse, setUserOriginalResponse] = useState<{

    stance: 'agree' | 'disagree';
    reasoning: string;
  } | null>(null);
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState<OpinionStats | null>(null);
  

  // Use real-time stats
  const today = new Date().toISOString().split("T")[0];
  const { stats: realtimeStats } = useRealTimeStats(today);


  function getOrCreateUserId() {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      let id = localStorage.getItem("anonUserId");
      if (!id) {
        id = uuidv4();
        localStorage.setItem("anonUserId", id);
      }
      return id;
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      // Fallback to generating a session-only ID
      return uuidv4();
    }
  }

  // Define the fetchUserResponse function
  const fetchUserResponse = async () => {
    try {
      const userId = getOrCreateUserId();
      
      if (!userId) {
        console.log("No user ID available for fetching response");
        return;
      }
  
      const today = new Date().toISOString().split("T")[0];
      
      const responsesRef = collection(db, 'responses');
      const q = query(
        responsesRef, 
        where('userId', '==', userId),
        where('opinionId', '==', today)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const userResponse = doc.data() as OpinionResponse;
        
        setUserOriginalResponse({
          stance: userResponse.stance,
          reasoning: userResponse.reasoning
        });
        setSelectedOption(userResponse.stance);
        setReasoning(userResponse.reasoning);
        setHasAlreadySubmitted(true);
      }
    } catch (error) {
      console.error("Error fetching user response:", error);
      toast({
        title: "Error loading response",
        description: "Could not load your previous response.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    async function loadOpinion() {
      try {
        const todayOpinion = await getTodayOpinion()  // ← This function is the problem
        console.log("Today's opinion:", todayOpinion)
        if (todayOpinion) {
          setOpinionPiece(todayOpinion.content)

        } else {
          setOpinionPiece("🛠️ **Under Maintenance**...")  // ← This is showing because getTodayOpinion() returns null
        }
      } catch (error) {
        console.error("Error loading opinion:", error)
        setOpinionPiece("Error loading today's opinion. Please refresh the page.")
      } finally {
        setLoadingOpinion(false)
      }
    }
    
    loadOpinion()
  }, [])
  const handleSkip = () => {
    setShouldSkip(true);
  }

const handleSubmit = async () => {
  if (!selectedOption) {
    toast({
      title: "Please select an option",
      description: "Choose whether you agree or disagree first.",
      variant: "destructive",
    });
    return;
  }

  setIsSubmitting(true);

  try {
    // DEBUG: Check auth state
    console.log("🔍 Debug - Auth state:", auth.currentUser ? "LOGGED IN" : "NOT LOGGED IN");
    console.log("🔍 Debug - Current user UID:", auth.currentUser?.uid);
    console.log("🔍 Debug - Current user email:", auth.currentUser?.email);
    
    // Prepare headers
    const headers: any = {
      'Content-Type': 'application/json',
    };

    // Add auth token if user is signed in 
    const currentUser = auth.currentUser;
    console.log("🔍 Debug - User object:", auth.currentUser);
    console.log("🔍 Debug - Auth ready:", !!auth.currentUser);
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
        console.log("🔑 Auth token added to headers");
        console.log("🔑 Token starts with:", token.substring(0, 20) + "...");
      } catch (tokenError) {
        console.log("⚠️ Could not get auth token:", tokenError);
      }
    } else {
      console.log("👥 No authenticated user, sending as guest");
    }

    console.log("📤 Final headers:", headers);
    
    const finalReasoning = reasoning.trim() || " ";
    const today = new Date().toISOString().split("T")[0];
    
    console.log("📤 Submitting response with headers:", headers);
    
    // Use the new Cloud Function with proper auth
    const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/submitResponse', {
      method: 'POST',
      headers, // Now includes Authorization header when available
      body: JSON.stringify({
        opinionId: today,
        stance: selectedOption,
        reasoning: finalReasoning,
        // REMOVED: Don't send userId in body - server determines it from auth token
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Server response:", result);
    
    if (result.success) {
      console.log(`✅ Response submitted successfully as ${result.userType} user`);
      setHasSubmitted(true);
      await loadStats();
      
      toast({
        title: "Opinion submitted!",
        description: "Thank you for sharing your thoughts.",
      });
    } else {
      throw new Error(result.error || 'Submission failed');
    }

  } catch (error) {
    console.error("Error submitting response:", error);
    toast({
      title: "Submission failed",
      description: error instanceof Error ? error.message : "Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsSubmitting(false);
  }
};
  
  const handleFeedback = async() => {
    try {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      const content = textarea.value;
      if (!content) return;
      
      const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/handlefeedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content
        }),
      });
      
      if (response.ok) {
         textarea.value = '';
        setIsFeedbackSent(true);
        toast({
          title: "Feedback sent!",
          description: "Thank you for your feedback.",
        });
      } else {
        throw new Error('Failed to send feedback');
      }
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast({
        title: "Failed to send feedback",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }
  const loadStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const opinionStats = await getOpinionStats(today);
      setStats(opinionStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []); // Empty dependency array since this function doesn't depend on any props/state
  

  const handleAnimationComplete = useCallback(() => {
    // Delay the state update to avoid updating during render
    setTimeout(() => {
      setIsAnimationComplete(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (isAnimationComplete) {
      loadStats();
    }
  }, [isAnimationComplete]);

  // Use realtime stats when available
  const displayStats = realtimeStats || stats;
  // At the top of your component (with other hooks)
const router = useRouter();
const checkUserProfileOnReturn = async (user: AuthUser) => {
  try {
    console.log("🔍 Checking returning user profile...");
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("✅ Returning user has profile - showing content");
      setHasClicked(true); // Show the opinion content
    } else {
      console.log("❌ Returning user has no profile - redirecting to create");
      router.push('/create-profile');
    }
  } catch (error) {
    console.error("Error checking returning user profile:", error);
    // If error, redirect to profile creation to be safe
    router.push('/create-profile');
  }
};
useEffect(() => {
  // Check if user has seen onboarding (only on client side)
  if (typeof window !== 'undefined') {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      router.push('/onboarding');
      return;
    }
  }

  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      console.log('🔄 User detected:', currentUser.email);
      setUser(currentUser);
      
      // Check if they have a profile
      await checkUserProfileOnReturn(currentUser);
      
    } else {
      // No user signed in
      console.log('🔄 No user - showing sign-in popup');
      setHasClicked(false);
      setUser(null);
    }
  });

  return () => unsubscribe();
}, []);

// Define checkUserProfile as a separate function (outside both handlers)
const checkUserProfile = async (user: AuthUser) => {
  try {
    console.log("🔍 Checking if user has profile...");
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("✅ Profile found - redirecting to profile");
      router.push('/pro'); // or '/dashboard'
    } else {
      console.log("❌ No profile found - redirecting to create profile");
      router.push('/create-profile');
    }
  } catch (error) {
    console.error("Error checking user profile:", error);
    // Default to profile creation if error
    router.push('/create-profile');
  }
};

// Updated handleSignIn (now with profile checking)
const handleSignIn = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    console.log('🔵 About to open popup...');
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log('🟢 Sign in successful!', user.email);
    
    // Check profile after successful sign in
    await checkUserProfile(user);
    
  } catch (error) {
    console.error('🔴 Sign in failed:', error.code, error.message);
  }
  
  setHasClicked(true);
};

// Updated handleLogIn (fixed structure)
const handleLogIn = async () => {
  try {
    console.log('🔵 Starting log in...');
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'login'
    });
    
    console.log('🔵 About to open popup...');
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log('🟢 Log in successful!', user.email);
    
    // Check profile after successful login
    await checkUserProfile(user);
    
  } catch (error) {
    console.error('🔴 Log in failed:', error.code, error.message);
  }
  
  setHasClicked(true);
};
  
  const handleGuest = () => {
    console.log('Continue as Guest clicked');
    setHasClicked(true);
  };
  

  const copyToClipboard = () => {
    const shareText = `🏛️ THE DEMOCRACY DAILY ⚖️
  📜 Opinion of the Day: "${opinionPiece.split(' ').slice(0, 5).join(' ')}..."
  
  🗳️ My response: I ${selectedOption} because ${reasoning}
  
  🗣️ Share your voice: https://thedemocracydaily.com
  
  #DemocracyDaily #YourVoiceMatters #Democracy 🏛️`
  
    navigator.clipboard.writeText(shareText).then(
      () => {
        toast({
          title: "Copied to clipboard! 📋",
          description: "Your democratic voice is ready to share! 🗳️",
        })
      },
      (err) => {
        toast({
          title: "Failed to copy",
          description: "Could not copy text to clipboard.",
          variant: "destructive",
        })
      },
    )
  }
  
  const checkIfAlreadySubmitted = async () => {
    try {
      let userId = "anonymous";
      const currentUser = auth.currentUser;
      if(currentUser){
        userId = currentUser.uid;
        console.log("Authenticated user ID:", userId);
      }
  
      if (!userId) {
        console.log("No user ID available, skipping submission check");
        return;
      }
  
      const today = new Date().toISOString().split("T")[0];
      
      const responsesRef = collection(db, "responses");
      const q = query(
        responsesRef, 
        where("userId", "==", userId),
        where("opinionId", "==", today)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setHasAlreadySubmitted(true);
        // Load the existing response
        const existingResponse = querySnapshot.docs[0].data() as OpinionResponse;
        setUserOriginalResponse({
          stance: existingResponse.stance,
          reasoning: existingResponse.reasoning
        });
        setSelectedOption(existingResponse.stance);
        setReasoning(existingResponse.reasoning);
      }
    } catch (error) {
      console.error("Error checking submission status:", error);
      // Don't show error to user, just log it
    }
  };
useEffect(() => {
  if (typeof window !== 'undefined') {
    const timer = setTimeout(() => {
      checkIfAlreadySubmitted();
    }, 500);
    return () => clearTimeout(timer);
  }
}, [user]);

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `THE DEMOCRACY DAILY\nI ${selectedOption} that "${opinionPiece.substring(0, 30)}".... because  ${reasoning.substring(0, 100)} ${reasoning.length > 100 ? "..." : ""} Write your own opinion at https://thedemocracydaily.com`,
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank")
  }
  
  const shareToFacebook = () => {
    const shareText = `🏛️ THE DEMOCRACY DAILY ⚖️
  
  I ${selectedOption} because ${reasoning}
  
  🗣️ Share your voice: ${window.location.href}
  
  #DemocracyDaily #YourVoiceMatters #Democracy`
  
    navigator.clipboard.writeText(shareText).then(() => {
      // Open Facebook's create post page
      window.open('https://www.facebook.com/', '_blank')
      
      toast({
        title: "Copied for Facebook! 📋",
        description: "Facebook opened - paste your opinion in a new post!",
      })
    })
  }
  
  const shareToInstagram = () => {
    // Instagram doesn't have URL-based sharing, so clipboard is actually the RIGHT approach
    const shareText = `🏛️ THE DEMOCRACY DAILY ⚖️
  📜 I ${selectedOption} that "${opinionPiece.substring(0, 5)}..."
  
  🗣️ Share your voice: ${window.location.href}
  
  #DemocracyDaily #YourVoiceMatters #Democracy`
  
    navigator.clipboard.writeText(shareText).then(() => {
      // Also open Instagram so they can paste
      window.open('https://www.instagram.com/', '_blank')
      
      toast({
        title: "Copied for Instagram! 📋", 
        description: "Instagram opened - paste this in your story or post!",
      })
    })
  }
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-4 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* Newspaper-style header */}
        <div className="bg-white border-b-4 border-black mb-4 sm:mb-6 p-3 sm:p-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 font-serif tracking-tight">THE DEMOCRACY DAILY</h1>
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-gray-600 border-t border-b border-gray-300 py-2 px-2 sm:px-4 my-2 gap-2 sm:gap-0">
  <span>Vol. 1, No. 1</span>
  <span>{currentDate}</span>
  
  {/* Opinion Section Dropdown */}
            <OpinionDropdown sectionName="Daily Opinion" currentPage="home" />
          </div>
        </div>
      
        {!hasClicked && (
            <Blur onSignIn={handleSignIn} onLogIn={handleLogIn} onGuest={handleGuest} />
  
        )}

      {hasClicked && (
        <>
        {/* Main interactive opinion card */}
        <Card className="w-full shadow-lg border-0">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-center text-2xl font-serif">Opinion of the Day</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">

            {!hasSubmitted ? (
              <>
                <div className="min-h-[120px] p-4 sm:p-6 bg-white rounded-lg border border-gray-200 font-serif text-base sm:text-lg">
                  <KaraokeText
                    text={opinionPiece}
                    onComplete={handleAnimationComplete}
                    speed={karaokeSpeed}
                    shouldSkip={shouldSkip}
                    onSkipped={() => setShouldSkip(false)} 
                  />
                </div>
                
                <div className="flex justify-center items-center gap-2">
                  <label htmlFor="speed" className="text-sm font-medium">Speed:</label>
                  <input
                    type="range"
                    id="speed"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={karaokeSpeed}
                    onChange={(e) => setKaraokeSpeed(Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-sm">{karaokeSpeed.toFixed(1)}x</span>
                </div>
                <div className = "flex justify-center items-center gap-2">
                  <Button onClick={handleSkip}
                    className="w-32"
                  >
                    Skip
                  </Button>
                </div>

                {isAnimationComplete && (
                  <>
                    <div className="flex justify-center gap-3 sm:gap-4 mt-6">
                      <Button
                        variant={selectedOption === "agree" ? "default" : "outline"}
                        onClick={() => setSelectedOption("agree")}
                        className="w-20 sm:w-32 text-sm sm:text-base px-2 sm:px-4"
                      >
                        Agree
                      </Button>
                      <Button
                        variant={selectedOption === "disagree" ? "default" : "outline"}
                        onClick={() => setSelectedOption("disagree")}
                        className="w-20 sm:w-32 text-sm sm:text-base px-2 sm:px-4"
                      >
                        Disagree
                      </Button>
                    </div>
                

                    {selectedOption && (
                      <div className="space-y-2">
                        <h3 className="font-medium font-serif text-lg">Why do you {selectedOption}?</h3>
                        <Textarea
                          placeholder="Share your reasoning..."
                          value={reasoning}
                          onChange={(e) => setReasoning(e.target.value)}
                          rows={4}
                          className="font-serif"
                        />
                      </div>
                    )}
                  </>

                )}
              </>
            
            
            ) : (
              <div className="space-y-6">
                <div className="border rounded-lg p-6 bg-white">
                  <h3 className="font-serif text-xl font-bold mb-3">Today's Opinion</h3>
                  <p className="font-serif text-lg mb-4 italic">{opinionPiece}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold">Your stance:</span>
                    <span
                      className={`px-2 py-1 rounded text-sm ${selectedOption === "agree" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                    >
                      {selectedOption === "agree" ? "Agree" : "Disagree"}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Your reasoning:</span>
                    <p className="font-serif text-gray-700 mt-1 border-l-4 pl-4 py-2">{reasoning}</p>
                  </div>
                </div>

                <div className="border rounded-lg p-6 bg-white">
                  <h3 className="font-serif text-xl font-bold mb-3 flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Share your opinion
                  </h3>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Copy to clipboard</span>
                      <span className="sm:hidden">Copy</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareToTwitter} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
                      <FaXTwitter className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Share on X</span>
                      <span className="sm:hidden">X</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareToFacebook} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
                      <FaFacebook className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Share on Facebook</span>
                      <span className="sm:hidden">FB</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareToInstagram} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3">
                      <FaInstagram className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Share on Instagram</span>
                      <span className="sm:hidden">IG</span>
                    </Button>
                  </div>
                </div>

                {displayStats && (
                  <div className="border rounded-lg p-4 sm:p-6 bg-gray-50">
                    <h3 className="font-serif text-xl font-bold mb-4 text-center">Community Pulse</h3>
                    
                    <div className="mb-4">
                      <div className="flex h-8 rounded-lg overflow-hidden border-2 border-gray-300">
                        <div 
                          className="bg-green-500 flex items-center justify-center text-white font-semibold text-sm transition-all duration-500"
                          style={{ width: `${displayStats.agreePercentage}%` }}
                        >
                          {displayStats.agreePercentage > 15 && `${displayStats.agreePercentage}%`}
                        </div>
                        
                        <div 
                          className="bg-red-500 flex items-center justify-center text-white font-semibold text-sm transition-all duration-500"
                          style={{ width: `${displayStats.disagreePercentage}%` }}
                        >
                          {displayStats.disagreePercentage > 15 && `${displayStats.disagreePercentage}%`}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        {displayStats.agreeCount} Agree
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        {displayStats.disagreeCount} Disagree
                      </span>
                    </div>

                    <div className="text-center">
                      <p className="font-semibold text-lg">
                        {displayStats.agreePercentage > 60 && (
                          <span className="text-green-600">📈 People are mostly agreeing!</span>
                        )}
                        {displayStats.agreePercentage < 40 && (
                          <span className="text-red-600">📉 People are mostly disagreeing!</span>
                        )}
                        {displayStats.agreePercentage >= 40 && displayStats.agreePercentage <= 60 && (
                          <span className="text-gray-600">⚖️ It's a close split!</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on {displayStats.totalResponses} {displayStats.totalResponses === 1 ? 'response' : 'responses'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Dynamic Word Clouds */}
                <div className="space-y-4">
                  <h3 className="font-serif text-xl font-bold text-center">Live Word Clouds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <DynamicWordCloud opinionId={today} stance="agree" />
                    <DynamicWordCloud opinionId={today} stance="disagree" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {!hasSubmitted && (
            <CardFooter className="flex justify-end border-t bg-gray-50 p-4">
              {hasAlreadySubmitted ? (
                <div className="text-center w-full">
                  <p className="text-gray-600 mb-2">You've already submitted your opinion for today!</p>
                  <p className="text-sm text-gray-500">Come back tomorrow for a new question.</p>
                  <Button
                    onClick={async () => {
                      await fetchUserResponse();
                      setHasSubmitted(true);
                    }}
                    className="bg-gray-900 hover:bg-black"
                  >
                    View My Response
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedOption || !isAnimationComplete}
                  className="bg-gray-900 hover:bg-black"
                >
                  Submit Your Opinion
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
        </>
        )}

        {/* Typewriter Animation */}
        {!hasSubmitted && (
        <div className="bg-white border rounded-lg shadow-lg mt-6 p-6">
          <div className="text-center">
            <h3 className="font-serif text-xl font-bold mb-4">New feature coming soon!</h3>
            <TypewriterAnimation />
          </div>
        </div>
        )}
        {hasSubmitted && (
            <div className="bg-white border rounded-lg shadow-lg mt-6 p-6">
              <AIvsHumanButton 
                personOpinion={reasoning} 
                opinionOfTheDay={opinionPiece} 
              />
            </div>
          )}
      </div>

        {/* Enhanced Footer */}
  <div className="bg-white border-t-2 border-gray-300 mt-6">
    {/* Main Footer Content */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 text-xs sm:text-sm">
      
      {/* See More About the Site */}
      <div className="text-center md:text-left">
        <h3 className="font-serif font-bold text-lg mb-3 border-b border-gray-300 pb-2">
          About The Democracy Daily
        </h3>
        <div className="space-y-2 text-gray-700">
          <p className="font-serif">A platform dedicated to fostering civic engagement through daily opinion discussions.</p>
          <div className="space-y-1">
            <a href="mission.html" className="block hover:text-black transition-colors font-serif">
              📜 Our Mission
            </a>
            <a href="works.html" className="block hover:text-black transition-colors font-serif">
              ⚙️ How It Works
            </a>
            <a href="community.html" className="block hover:text-black transition-colors font-serif">
              🤝 Community Guidelines
            </a>
            <a href="priv.html" className="block hover:text-black transition-colors font-serif">
              🔒 Privacy Policy
            </a>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="text-center md:text-left">
        <h3 className="font-serif font-bold text-lg mb-3 border-b border-gray-300 pb-2">
          Contact
        </h3>
        <div className="space-y-2 text-gray-700">
          <div className="font-serif">
            <p className="font-semibold mb-2">Get in touch:</p>
            <div className="space-y-1">
              <p>📧 democracydaily.editor@gmail.com</p>
              <p>📱 Follow us on social media</p>
            </div>
          </div>
          <div className="flex justify-center md:justify-start gap-3 mt-3">
          { /*<Button variant="outline" size="sm" className="font-serif text-xs">
              <FaFacebook className="h-3 w-3 mr-1" />
              Facebook
            </Button>*/}
            <Button 
              variant="outline" 
              size="sm" 
              className="font-serif text-xs"
              onClick={() => window.open('https://www.instagram.com/the_democracydaily/', '_blank')}
              >
              <FaInstagram className="h-3 w-3 mr-1" />
              Instagram
            </Button>
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="text-center md:text-left">
        <h3 className="font-serif font-bold text-lg mb-3 border-b border-gray-300 pb-2">
          Your Feedback
        </h3>
        <div className="space-y-3">
          <p className="font-serif text-gray-700 text-xs">
            Help us improve! Share your thoughts on the platform.
          </p>
          <Textarea 
            placeholder="What would you like to see improved or added?"
            className="font-serif text-xs h-20 resize-none"
          />
          <Button 
            size="sm" 
            className="w-full bg-gray-900 hover:bg-black font-serif text-xs"
            onClick={handleFeedback}
          >
            Send Feedback
          </Button>
          <div className="text-xs text-gray-500 font-serif">
            <p>💡 Suggest new topics</p>
            <p>🐛 Report issues</p>
            <p>✨ Request features</p>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom Footer Bar */}
    <div className="border-t border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-600">
      <div className="flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="font-serif">
          <strong>THE DEMOCRACY DAILY</strong> - Where Your Voice Matters
        </div>
        <div className="font-serif">
          All opinions expressed are subject to public discourse and democratic values.
        </div>
        <div className="font-serif text-gray-500">
          © 2025 The Democracy Daily
        </div>
      </div>  {/* ✅ Close flex container */}
    </div>    {/* ✅ Close bottom footer bar */}
  </div>      {/* ✅ Close main footer container */}
  

  {/* Retake Tour Button */}
  <div className="fixed bottom-4 right-4 z-50">
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        localStorage.removeItem('hasSeenOnboarding');
        router.push('/onboarding');
      }}
      className="px-3 py-2 bg-white/90 backdrop-blur-sm border-2 hover:bg-white shadow-lg text-xs font-serif"
    >
      📚 Retake Tour
    </Button>
  </div>

  <Toaster />
</div>        
)             
}            
