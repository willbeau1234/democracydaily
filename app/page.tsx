"use client" // Tells Next.js this is a client-side component

import { useState, useCallback, useMemo, use, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import KaraokeText from "@/components/karaoke-text"
import { Share2, Copy, Twitter, Facebook } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from "uuid";
import { getTodayOpinion, getOpinionStats, OpinionStats, useRealTimeStats, useRealTimeWordCloud } from "@/lib/firebase";
import { collection, addDoc } from 'firebase/firestore';
import { query, where, getDocs } from 'firebase/firestore';

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
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-serif text-lg font-semibold">
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
          className="w-full h-auto border border-gray-200 rounded"
          style={{ maxWidth: '100%', height: 'auto' }}
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
  const [opinionPiece, setOpinionPiece] = useState("")
  const [loadingOpinion, setLoadingOpinion] = useState(true)

  useEffect(() => {
    async function loadOpinion() {
      try {
        const todayOpinion = await getTodayOpinion()
        if (todayOpinion) {
          setOpinionPiece(todayOpinion.content)
        } else {
          setOpinionPiece("No opinion available for today. Check back tomorrow!")
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

  function getOrCreateUserId() {
    let id = localStorage.getItem("anonUserId");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("anonUserId", id);
    }
    return id;
  }

  // Updated to use new Cloud Function
  const handleSubmit = async () => {
    if (selectedOption && reasoning.trim()) {
      try {
        const userId = getOrCreateUserId();
        const today = new Date().toISOString().split("T")[0];
        
        // Use the new Cloud Function
        const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/submitResponse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            opinionId: today,
            stance: selectedOption,
            reasoning: reasoning.trim(),
            userId: userId
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          console.log("Response submitted successfully!");
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
          description: "Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const [stats, setStats] = useState<OpinionStats | null>(null);
  
  // Use real-time stats
  const today = new Date().toISOString().split("T")[0];
  const { stats: realtimeStats } = useRealTimeStats(today);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const opinionStats = await getOpinionStats(today);
      setStats(opinionStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleAnimationComplete = () => {
    setIsAnimationComplete(true)
  }

  useEffect(() => {
    if (isAnimationComplete) {
      loadStats();
    }
  }, [isAnimationComplete]);

  // Use realtime stats when available
  const displayStats = realtimeStats || stats;

  const copyToClipboard = () => {
    const shareText = `THE DEMOCRACY DAILY\nOpinion of the Day: "${opinionPiece}"\n\nMy response: I ${selectedOption} because ${reasoning}`
    navigator.clipboard.writeText(shareText).then(
      () => {
        toast({
          title: "Copied to clipboard",
          description: "Your opinion and response have been copied to your clipboard.",
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

  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);
  
  const checkIfAlreadySubmitted = async () => {
    try {
      const userId = getOrCreateUserId();
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
      }
    } catch (error) {
      console.error("Error checking submission status:", error);
    }
  };

  useEffect(() => {
    checkIfAlreadySubmitted();
  }, []);

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `THE DEMOCRACY DAILY\nI ${selectedOption} that "${opinionPiece}" because ${reasoning.substring(0, 100)}${reasoning.length > 100 ? "..." : ""}`,
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank")
  }

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* Newspaper-style header */}
        <div className="bg-white border-b-4 border-black mb-6 p-6 text-center">
          <h1 className="text-5xl font-bold mb-2 font-serif tracking-tight">THE DEMOCRACY DAILY</h1>
          <div className="flex justify-between items-center text-sm text-gray-600 border-t border-b border-gray-300 py-2 px-4 my-2">
            <span>Vol. 1, No. 1</span>
            <span>{currentDate}</span>
            <span>Opinion Section</span>
          </div>
        </div>

        {/* Main interactive opinion card */}
        <Card className="w-full shadow-lg border-0">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-center text-2xl font-serif">Opinion of the Day</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {!hasSubmitted ? (
              <>
                <div className="min-h-[120px] p-6 bg-white rounded-lg border border-gray-200 font-serif text-lg">
                  <KaraokeText
                    text={opinionPiece}
                    onComplete={handleAnimationComplete}
                    speed={karaokeSpeed}
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

                {isAnimationComplete && (
                  <>
                    <div className="flex justify-center gap-4 mt-6">
                      <Button
                        variant={selectedOption === "agree" ? "default" : "outline"}
                        onClick={() => setSelectedOption("agree")}
                        className="w-32"
                      >
                        Agree
                      </Button>
                      <Button
                        variant={selectedOption === "disagree" ? "default" : "outline"}
                        onClick={() => setSelectedOption("disagree")}
                        className="w-32"
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
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex items-center gap-1">
                      <Copy className="h-4 w-4" />
                      Copy to clipboard
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareToTwitter} className="flex items-center gap-1">
                      <Twitter className="h-4 w-4" />
                      Share on Twitter
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareToFacebook} className="flex items-center gap-1">
                      <Facebook className="h-4 w-4" />
                      Share on Facebook
                    </Button>
                  </div>
                </div>

                {displayStats && (
                  <div className="border rounded-lg p-6 bg-gray-50">
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

                {/* NEW: Dynamic Word Clouds */}
                <div className="space-y-4">
                  <h3 className="font-serif text-xl font-bold text-center">Live Word Clouds</h3>
                  <div className="grid md:grid-cols-2 gap-6">
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
                    onClick={() => setHasSubmitted(true)}
                    className="bg-gray-900 hover:bg-black"
                  >
                    View My Response
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedOption || !reasoning.trim() || !isAnimationComplete}
                  className="bg-gray-900 hover:bg-black"
                >
                  Submit Your Opinion
                </Button>
              )}
            </CardFooter>
          )}
        </Card>

        <div className="bg-white border-t border-gray-300 mt-6 p-4 text-center text-sm text-gray-600">
          <p>THE DEMOCRACY DAILY - Where Your Voice Matters</p>
          <p className="mt-1">All opinions expressed are subject to public discourse and democratic values.</p>
        </div>
      </div>

      <Toaster />
    </div>
  )
}