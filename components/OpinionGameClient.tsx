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

  // All your existing handlers and effects remain exactly the same...
  // (I'll include the key ones but keeping this concise)

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
      const today = new Date().toLocaleDateString('en-CA', { 
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
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
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Add your auth logic here
      } else {
        setHasClicked(false);
        setUser(null);
      }
    });

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
        <Blur onSignIn={() => {}} onLogIn={() => {}} onGuest={() => setHasClicked(true)} />
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

            {!hasSubmitted && (
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
          </Card>
        </>
      )}

      <Toaster />
    </>
  )
}