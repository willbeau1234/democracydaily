"use client"

import { useState, useCallback, useMemo, use } from "react"// React hook for state management
import { Button } from "@/components/ui/button" // Custom button component
import { Textarea } from "@/components/ui/textarea" // Custom textarea component
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" // Layout components
import KaraokeText from "@/components/karaoke-text" // Animated text component for the opinion
import { Share2, Copy, Twitter, Facebook } from "lucide-react" // Icons used for UI (sharing, copying)
import { toast } from "@/components/ui/use-toast" // Hook to trigger toast messages
import { Toaster } from "@/components/ui/toaster" // Renders toast notifications

import { db } from '../firebase'; // import the Firestore instance
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from "uuid";  // Import the uuid function

// The opinion piece being displayed to the user
const opinionPiece =
  "Hey data miners, where's my cut of the gold? 💰Every time you post a brunch pic or take that 'Which potato dish are you?' quiz, tech companies are quietly high-fiving their investors. Your random Tuesday scrolling session is basically an unpaid internship for Silicon Valley billionaires!Mark Zuckerberg is out there buying islands with money made from knowing you binged cat videos at 2am. Meanwhile, you're getting... targeted ads for cat food? What if your phone dinged with actual money notifications instead of just likes? 'Congratulations! Your weird shopping habits earned you $5 today!' Now THAT'S an app notification I wouldn't swipe away.So what do you think? Should companies slip some cash into your digital wallet when they slip your data into theirs?"
export default function OpinionGame() {
  const [selectedOption, setSelectedOption] = useState<"agree" | "disagree" | null>(null)
  const [reasoning, setReasoning] = useState("")
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Submit handler: Only allows submission if an option is selected and reasoning is entered
  const handleSubmit = async () => {
    if (selectedOption && reasoning.trim()) {
      const userId = getOrCreateUserId(); // Get or create user ID
      const today = new Date().toISOString().split("T")[0]; // Get today's date
      const docId = `${userId}_${today}`; // Document ID will be uniqeu for each user per day

      const docRef = doc(db, "opinions", docId); // Firestore document reference

      // Check if the user has already submitted an opinion today (TODO: YOU NEED TO UPDATED THIS! IT WILL KEEP READING THE PROMPT BUT ID SUGGEST SOME MESSAGE BEFORE)
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        alert("You've already answered today.");
        return;
      }

      // Save the user's response to Firestore
      await setDoc(docRef, {
        userId,
        selectedOption,
        reasoning,
        date: today,
        timestamp: serverTimestamp(),
      });

      setHasSubmitted(true); // Update state to reflect submission (TODO: THIS IS THE INDICATION YOU SHOULD USE TO CHANGE THE VIEW OF THE PAGE ONCE SUBMITTED)
    }
  };
  function getOrCreateUserId() {
    let id = localStorage.getItem("anonUserId");
    if (!id) {
      id = uuidv4();  // Generate unique IDs
      localStorage.setItem("anonUserId", id);
    }
    return id;
  }

  const handleAnimationComplete = () => {
    setIsAnimationComplete(true)
  }

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

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `THE DEMOCRACY DAILY\nI ${selectedOption} that "${opinionPiece}" because ${reasoning.substring(0, 100)}${reasoning.length > 100 ? "..." : ""}`,
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank")
  }

  const shareToFacebook = () => {
    // In a real app, you'd use the Facebook SDK or share API
    // This is a simplified version
    const url = encodeURIComponent(window.location.href)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        {/* Newspaper Header */}
        <div className="bg-white border-b-4 border-black mb-6 p-6 text-center">
          <h1 className="text-5xl font-bold mb-2 font-serif tracking-tight">THE DEMOCRACY DAILY</h1>
          <div className="flex justify-between items-center text-sm text-gray-600 border-t border-b border-gray-300 py-2 px-4 my-2">
            <span>Vol. 1, No. 1</span>
            <span>{currentDate}</span>
            <span>Opinion Section</span>
          </div>
        </div>

        <Card className="w-full shadow-lg border-0">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-center text-2xl font-serif">Opinion of the Day</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {!hasSubmitted ? (
              <>
                <div className="min-h-[120px] p-6 bg-white rounded-lg border border-gray-200 font-serif text-lg">
<<<<<<< Updated upstream
  <KaraokeText text={opinionPiece} onComplete={handleAnimationComplete} />
=======
                  <KaraokeText
                    text={opinionPiece}
                    onComplete={handleAnimationComplete}
                    speed={karaokeSpeed} // <-- pass speed 
                  />
                </div>
                {/* Speed control */}
                <div className="flex justify-center items-center gap-2">
                  <label htmlFor="speed" className="text-sm font-medium">
                    Speed:
                  </label>
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
>>>>>>> Stashed changes
                </div >

    { isAnimationComplete && (
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
    )
}
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
  </div>
)}
          </CardContent >
  <CardFooter className="flex justify-end border-t bg-gray-50 p-4">
    {!hasSubmitted ? (
      <Button
        onClick={handleSubmit}
        disabled={!selectedOption || !reasoning.trim() || !isAnimationComplete}
        className="bg-gray-900 hover:bg-black"
      >
        Submit Your Opinion
      </Button>
    ) : (
      <Button
        onClick={() => {
          setSelectedOption(null)
          setReasoning("")
          setHasSubmitted(false)
          setIsAnimationComplete(false)
        }}
        className="bg-gray-900 hover:bg-black"
      >
        New Opinion
      </Button>
    )}
  </CardFooter>
        </Card >

  {/* Newspaper Footer */ }
  < div className = "bg-white border-t border-gray-300 mt-6 p-4 text-center text-sm text-gray-600" >
          <p>THE DEMOCRACY DAILY - Where Your Voice Matters</p>
          <p className="mt-1">All opinions expressed are subject to public discourse and democratic values.</p>
        </div >
      </div >
  <Toaster />
    </div >
  )
}
