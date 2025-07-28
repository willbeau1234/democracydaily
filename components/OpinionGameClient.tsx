"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import AdSenseScript from "@/components/AdSenseScript"
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
import { getOpinionStats, OpinionStats } from "@/lib/firebase";
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

interface OpinionGameClientProps {
  initialOpinion: string;
  initialStats: OpinionStats | null;
}

// Dynamic Word Cloud Component (keeping your existing implementation)
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

export default function OpinionGameClient({ initialOpinion, initialStats }: OpinionGameClientProps) {
  const [selectedOption, setSelectedOption] = useState<"agree" | "disagree" | null>(null)
  const [gaveOption, setGaveOption] = useState(false)
  const [reasoning, setReasoning] = useState("")
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [karaokeSpeed, setKaraokeSpeed] = useState(1)
  const [shouldSkip, setShouldSkip] = useState(false)
  const [opinionPiece, setOpinionPiece] = useState(initialOpinion)
  const [loadingOpinion, setLoadingOpinion] = useState(false) // No longer loading since we have initial data
  const [isFeedbackSent, setIsFeedbackSent] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userOriginalResponse, setUserOriginalResponse] = useState<{
    stance: 'agree' | 'disagree';
    reasoning: string;
  } | null>(null);
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState<OpinionStats | null>(initialStats);

  // Use real-time stats with Chicago timezone
  const today = new Date().toLocaleDateString('en-CA', { 
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const { stats: realtimeStats } = useRealTimeStats(today);

  // All your existing functions remain the same...
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
      return uuidv4();
    }
  }

  // Authentication functions
  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('User signed in:', result.user);
      setHasClicked(true);
      // Store that user has interacted
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasInteracted', 'true');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Error signing in. Please try again.');
    }
  };

  const handleLogIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('User logged in:', result.user);
      setHasClicked(true);
      // Store that user has interacted
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasInteracted', 'true');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Error logging in. Please try again.');
    }
  };

  // Reset interaction state (for testing/debugging)
  // You can call this in browser console: window.resetInteractionState()
  if (typeof window !== 'undefined') {
    (window as any).resetInteractionState = () => {
      localStorage.removeItem('hasInteracted');
      setHasClicked(false);
      console.log('Interaction state reset - blur screen will show again');
    };
  }

  // Social sharing functions
  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out today's opinion: "${opinionPiece.substring(0, 100)}..." What do you think?`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
  };

  const shareToTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`What's your take on today's opinion? "${opinionPiece.substring(0, 80)}..." Join the discussion!`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToInstagram = () => {
    // Instagram doesn't have a direct share API for web, so we'll copy to clipboard
    copyToClipboard();
    toast({
      title: "Link copied!",
      description: "Share this link on Instagram or any platform!",
    });
  };

  const copyToClipboard = () => {
    const textToCopy = `Check out today's political opinion: "${opinionPiece.substring(0, 100)}..." What do you think? ${window.location.href}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: "Copied to clipboard!",
        description: "You can now share this anywhere!",
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    });
  };

  // Daily submission tracking functions
  const getTodayKey = () => {
    return new Date().toLocaleDateString('en-CA', { 
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const checkDailySubmissionStatus = () => {
    if (typeof window === 'undefined') return;
    
    const todayKey = getTodayKey();
    const submissionKey = `submitted_${todayKey}`;
    const hasSubmittedToday = localStorage.getItem(submissionKey) === 'true';
    
    if (hasSubmittedToday) {
      setHasSubmitted(true);
      setHasAlreadySubmitted(true);
      console.log('User has already submitted today (localStorage check)');
      
      // Load their previous response
      const responseKey = `response_${todayKey}`;
      const savedResponse = localStorage.getItem(responseKey);
      if (savedResponse) {
        try {
          const response = JSON.parse(savedResponse);
          setSelectedOption(response.stance);
          setReasoning(response.reasoning);
          setUserOriginalResponse(response);
          console.log('Loaded previous response from localStorage');
        } catch (error) {
          console.error('Error parsing saved response:', error);
        }
      }
    }
  };

  const checkUserDailySubmission = async (userId: string) => {
    try {
      const todayKey = getTodayKey();
      
      // Check with server first
      const response = await fetch(`https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/checkDailySubmission?userId=${userId}&date=${todayKey}`);
      const result = await response.json();
      
      if (result.success && result.hasSubmitted) {
        setHasSubmitted(true);
        setHasAlreadySubmitted(true);
        
        // Store in localStorage for faster future checks
        if (typeof window !== 'undefined') {
          localStorage.setItem(`submitted_${todayKey}`, 'true');
          if (result.response) {
            localStorage.setItem(`response_${todayKey}`, JSON.stringify(result.response));
            setSelectedOption(result.response.stance);
            setReasoning(result.response.reasoning);
            setUserOriginalResponse(result.response);
          }
        }
        
        console.log('User has already submitted today (server check)');
      }
    } catch (error) {
      console.error('Error checking daily submission:', error);
      // Fallback to localStorage check
      checkDailySubmissionStatus();
    }
  };

  const saveResponseLocally = (response: any) => {
    if (typeof window === 'undefined') return;
    
    const todayKey = getTodayKey();
    localStorage.setItem(`submitted_${todayKey}`, 'true');
    localStorage.setItem(`response_${todayKey}`, JSON.stringify(response));
    
    // Also save to a running list of all responses
    const allResponsesKey = 'all_responses';
    const existingResponses = localStorage.getItem(allResponsesKey);
    const responsesList = existingResponses ? JSON.parse(existingResponses) : [];
    
    // Add new response with timestamp
    responsesList.push({
      ...response,
      date: todayKey,
      timestamp: new Date().toISOString()
    });
    
    localStorage.setItem(allResponsesKey, JSON.stringify(responsesList));
    console.log('Response saved locally');
  };

  const cleanOldResponses = () => {
    if (typeof window === 'undefined') return;
    
    // Clean up localStorage entries older than 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('submitted_') || key.startsWith('response_')) {
        const dateStr = key.split('_')[1];
        if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const responseDate = new Date(dateStr);
          if (responseDate < cutoffDate) {
            localStorage.removeItem(key);
            console.log(`Cleaned old response: ${key}`);
          }
        }
      }
    });
  };

  const setupMidnightReset = () => {
    if (typeof window === 'undefined') return;
    
    // Calculate time until next midnight in Chicago timezone
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // Convert to Chicago time
    const chicagoTime = new Date(tomorrow.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    const timeUntilMidnight = chicagoTime.getTime() - now.getTime();
    
    console.log(`Setting up midnight reset in ${Math.round(timeUntilMidnight / 1000 / 60 / 60)} hours`);
    
    setTimeout(() => {
      console.log('Midnight reset triggered - clearing daily submission status');
      setHasSubmitted(false);
      setHasAlreadySubmitted(false);
      setSelectedOption(null);
      setReasoning('');
      setUserOriginalResponse(null);
      
      // Clean old responses every midnight
      cleanOldResponses();
      
      // Set up the next midnight reset
      setupMidnightReset();
    }, timeUntilMidnight);
  };

  // All your existing handlers and effects remain exactly the same...
  // (I'll include the key ones but keeping this concise)

  const handleSubmit = async () => {
    // Check if user has already submitted today
    if (hasAlreadySubmitted || hasSubmitted) {
      toast({
        title: "Already submitted today",
        description: "You can only submit one opinion per day. Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }

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
      const headers: any = {
        'Content-Type': 'application/json',
      };

      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } catch (tokenError) {
          console.log("⚠️ Could not get auth token:", tokenError);
        }
      }
      
      const finalReasoning = reasoning.trim() || " ";
      const today = getTodayKey();
      
      // Create response object for saving
      const responseData = {
        opinionId: today,
        stance: selectedOption,
        reasoning: finalReasoning,
        userId: currentUser?.uid || getOrCreateUserId(),
        userType: currentUser ? 'authenticated' : 'anonymous'
      };

      // Save locally first (as backup)
      saveResponseLocally(responseData);
      
      const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/submitResponse', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          opinionId: today,
          stance: selectedOption,
          reasoning: finalReasoning,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setHasSubmitted(true);
        setHasAlreadySubmitted(true);
        setUserOriginalResponse(responseData);
        await loadStats();
        
        toast({
          title: "Opinion submitted!",
          description: "Thank you for sharing your thoughts. See you tomorrow for the next opinion!",
        });
      } else {
        // Remove local save if server submission failed
        const todayKey = getTodayKey();
        localStorage.removeItem(`submitted_${todayKey}`);
        localStorage.removeItem(`response_${todayKey}`);
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

  // Add all your other handlers here (keeping them exactly the same)
  const handleSkip = () => {
    setShouldSkip(true);
  }

  const handleAnimationComplete = useCallback(() => {
    setTimeout(() => {
      setIsAnimationComplete(true);
    }, 0);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA', { 
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const opinionStats = await getOpinionStats(today);
      setStats(opinionStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  useEffect(() => {
    setIsClientMounted(true);
    
    if (typeof window !== 'undefined') {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        // Handle onboarding redirect
      }
      
      // Check if user has already interacted with the app (guest or signed in)
      const hasInteracted = localStorage.getItem('hasInteracted');
      if (hasInteracted === 'true') {
        setHasClicked(true);
        console.log('User has already interacted, skipping blur screen');
      }

      // Check daily submission status
      checkDailySubmissionStatus();
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setHasClicked(true); // Skip blur screen if user is already signed in
        // Store that user has interacted
        if (typeof window !== 'undefined') {
          localStorage.setItem('hasInteracted', 'true');
        }
        console.log('User already signed in, skipping blur screen');
        
        // Check if this authenticated user has already submitted today
        await checkUserDailySubmission(currentUser.uid);
      } else {
        // Don't automatically set hasClicked to false if user has already interacted
        const hasInteracted = typeof window !== 'undefined' ? 
          localStorage.getItem('hasInteracted') === 'true' : false;
        if (!hasInteracted) {
          setHasClicked(false);
        }
        setUser(null);
        
        // Check anonymous user submission
        const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('anonUserId') : null;
        if (anonUserId) {
          await checkUserDailySubmission(anonUserId);
        }
      }
    });

    // Set up midnight reset timer
    setupMidnightReset();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAnimationComplete) {
      loadStats();
    }
  }, [isAnimationComplete]);

  const displayStats = realtimeStats || stats;

  if (!isClientMounted) {
    return (
      <div className="min-h-screen bg-gray-100 p-3 sm:p-4 flex flex-col items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* AdSense Script */}
      <AdSenseScript
        hasContent={hasClicked && isAnimationComplete && !!opinionPiece && !opinionPiece.includes("We're preparing today's")}
        isLoading={loadingOpinion}
        isAuthenticated={hasClicked}
        contentText={opinionPiece + (reasoning ? ` ${reasoning}` : '')}
        minContentLength={200}
      />

      {!hasClicked && (
        <Blur 
          onSignIn={handleSignIn} 
          onLogIn={handleLogIn} 
          onGuest={() => {
            setHasClicked(true);
            // Store that user has interacted as guest
            if (typeof window !== 'undefined') {
              localStorage.setItem('hasInteracted', 'true');
            }
            console.log('User chose to continue as guest, saving interaction state');
          }} 
        />
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
                  <div className="flex justify-center items-center gap-2">
                    <Button onClick={handleSkip} className="w-32">
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
                  {/* Your existing results display */}
                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-serif text-xl font-bold mb-3">Today's Opinion</h3>
                    <p className="font-serif text-lg mb-4 italic">{opinionPiece}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold">Your stance:</span>
                      <span
                        className={`px-2 py-1 rounded text-sm ${selectedOption === "agree" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {selectedOption === "agree" ? "Agree" : "Disagree"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-semibold">Your reasoning:</span>
                      <p className="font-serif text-gray-700 mt-1 border-l-4 pl-4 py-2">{reasoning}</p>
                      
                      {/* Social Sharing - Compact Newspaper Style */}
                      <div className="mt-4 p-3 border-2 border-gray-300 bg-gray-50">
                        <div className="text-center mb-2">
                          <h5 className="text-sm font-serif font-bold">SHARE YOUR VOICE</h5>
                          <p className="text-xs text-gray-600 font-serif">Spread the democratic discussion</p>
                        </div>
                        
                        <div className="flex flex-wrap justify-center gap-2">
                          {/* Facebook */}
                          <button
                            onClick={shareToFacebook}
                            className="border border-black bg-white hover:bg-gray-100 px-2 py-1 text-center transition-colors text-xs"
                          >
                            <FaFacebook className="w-3 h-3 inline mr-1 text-blue-600" />
                            <span className="font-serif font-bold">FACEBOOK</span>
                          </button>

                          {/* Twitter */}
                          <button
                            onClick={shareToTwitter}
                            className="border border-black bg-white hover:bg-gray-100 px-2 py-1 text-center transition-colors text-xs"
                          >
                            <FaXTwitter className="w-3 h-3 inline mr-1 text-gray-900" />
                            <span className="font-serif font-bold">TWITTER</span>
                          </button>

                          {/* Instagram */}
                          <button
                            onClick={shareToInstagram}
                            className="border border-black bg-white hover:bg-gray-100 px-2 py-1 text-center transition-colors text-xs"
                          >
                            <FaInstagram className="w-3 h-3 inline mr-1 text-pink-600" />
                            <span className="font-serif font-bold">INSTAGRAM</span>
                          </button>

                          {/* Copy Link */}
                          <button
                            onClick={copyToClipboard}
                            className="border border-black bg-white hover:bg-gray-100 px-2 py-1 text-center transition-colors text-xs"
                          >
                            <Copy className="w-3 h-3 inline mr-1 text-gray-700" />
                            <span className="font-serif font-bold">COPY</span>
                          </button>

                          {/* General Share */}
                          <button
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: 'Democracy Daily - Opinion of the Day',
                                  text: `Check out today's opinion: "${opinionPiece.substring(0, 100)}..."`,
                                  url: window.location.href
                                });
                              } else {
                                copyToClipboard();
                              }
                            }}
                            className="border border-black bg-white hover:bg-gray-100 px-2 py-1 text-center transition-colors text-xs"
                          >
                            <Share2 className="w-3 h-3 inline mr-1 text-blue-600" />
                            <span className="font-serif font-bold">SHARE</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats and word clouds */}
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
                      <div className="text-center">
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

            {!hasSubmitted && !hasAlreadySubmitted && (
              <CardFooter className="flex justify-end border-t bg-gray-50 p-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedOption || !isAnimationComplete || isSubmitting}
                  className="bg-gray-900 hover:bg-black"
                >
                  {isSubmitting ? "Submitting..." : "Submit Your Opinion"}
                </Button>
              </CardFooter>
            )}

            {hasAlreadySubmitted && !hasSubmitted && (
              <CardFooter className="border-t bg-yellow-50 p-4">
                <div className="w-full text-center">
                  <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                    <h4 className="font-serif font-bold text-yellow-800 mb-2">📝 Today's Opinion Already Recorded</h4>
                    <p className="text-sm text-yellow-700 font-serif">
                      You've already shared your thoughts today. Your opinion contributes to our democratic discourse!
                    </p>
                    <div className="mt-3 text-xs text-yellow-600 font-serif italic">
                      Come back tomorrow for a new opinion to consider
                    </div>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>

          {/* Post-Submission Features - Only show after user submits */}
          {hasSubmitted && (
            <>
              {/* AI Battle Section - Newspaper Style */}
              <div className="mt-8 bg-white border-4 border-black shadow-lg">
                {/* Newspaper Header */}
                <div className="border-b-2 border-black bg-gray-50 p-4 text-center">
                  <h3 className="text-2xl font-serif font-bold tracking-wide">SPECIAL FEATURE</h3>
                  <div className="text-xs text-gray-600 mt-1 flex justify-between items-center">
                    <span>DEBATE ARENA</span>
                    <span>•••</span>
                    <span>INTERACTIVE EDITION</span>
                  </div>
                </div>
                
                {/* AI Battle Content */}
                <div className="p-6">
                  <div className="text-center mb-4">
                    <h4 className="text-xl font-serif font-bold mb-2">CHALLENGE THE MACHINE</h4>
                    <p className="text-sm font-serif text-gray-700 leading-relaxed">
                      Your opinion has been recorded in the public discourse. Now, test your reasoning against 
                      artificial intelligence in our revolutionary debate simulator.
                    </p>
                  </div>
                  
                  <div className="flex justify-center">
                    <AIvsHumanButton 
                      personOpinion={reasoning} 
                      opinionOfTheDay={opinionPiece} 
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Toaster />
    </>
  )
}