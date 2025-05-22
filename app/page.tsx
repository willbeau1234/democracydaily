"use client"

import { useState, useEffect } from "react"// React hook for state management
import { Button } from "@/components/ui/button" // Custom button component
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card" // Layout componentsimport { toast } from "@/components/ui/use-toast" // Hook to trigger toast messages
import { Toaster } from "@/components/ui/toaster" // Renders toast notifications

import { db } from '../firebase'; // import the Firestore instance
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { collection, query, where, getDocs } from "firebase/firestore"
import { Timestamp } from "firebase/firestore"

import { v4 as uuidv4 } from "uuid";  // Import the uuid function

import SharePanel from "@/components/SharePanel"
import OpinionDisplay from "@/components/OpinionDisplay"
import OpinionSummary from "@/components/OpinionSummary"

// The opinion piece being displayed to the user
// const opinionPiece =
//   "Hey data miners,..."

export default function OpinionGame() {

  const [selectedOption, setSelectedOption] = useState<"agree" | "disagree" | null>(null)
  const [reasoning, setReasoning] = useState("")
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [karaokeSpeed, setKaraokeSpeed] = useState(1);
  const [loading, setLoading] = useState(false);

  const [opinionPiece, setOpinionPiece] = useState<string>("")

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  useEffect(() => {
    const fetchTodaysQuestion = async () => {
      try {
        const now = new Date()
        const startOfDay = new Date(now.setHours(0, 0, 0, 0))
        const endOfDay = new Date(now.setHours(23, 59, 59, 999))

        const questionsRef = collection(db, "questions")
        const q = query(
          questionsRef,
          where("date", ">=", Timestamp.fromDate(startOfDay)),
          where("date", "<=", Timestamp.fromDate(endOfDay))
        )

        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data()
          setOpinionPiece(docData.question)
        } else {
          console.warn("No question found for today.")
        }
      } catch (error) {
        console.error("Error fetching today's question:", error)
      }
    }

    fetchTodaysQuestion()
  }, [])


  useEffect(() => {
    const checkIfAlreadySubmitted = async () => {
      const userId = getOrCreateUserId();
      const today = new Date().toISOString().split("T")[0];
      const docId = `${userId}_${today}`;
      const docRef = doc(db, "opinions", docId);

      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        setHasSubmitted(true);
      }
    };

    checkIfAlreadySubmitted();
  }, []);


  // Submit handler: Only allows submission if an option is selected and reasoning is entered
  const handleSubmit = async () => {
    if (!selectedOption || !reasoning.trim()) return;

    setLoading(true);
    try {
      const userId = getOrCreateUserId();
      const today = new Date().toISOString().split("T")[0];
      const docId = `${userId}_${today}`;
      const docRef = doc(db, "opinions", docId);

      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        alert("You've already answered today.");
        return;
      }

      await setDoc(docRef, {
        userId,
        selectedOption,
        reasoning,
        date: today,
        timestamp: serverTimestamp(),
      });

      setHasSubmitted(true);
    } catch (err) {
      console.error("Error submitting opinion:", err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
              <OpinionDisplay
                opinionText={opinionPiece}
                karaokeSpeed={karaokeSpeed}
                setKaraokeSpeed={setKaraokeSpeed}
                selectedOption={selectedOption}
                setSelectedOption={setSelectedOption}
                reasoning={reasoning}
                setReasoning={setReasoning}
                isAnimationComplete={isAnimationComplete}
                onAnimationComplete={handleAnimationComplete}
              />

            ) : (
              <div className="space-y-6">
                <OpinionSummary
                  opinionText={opinionPiece}
                  selectedOption={selectedOption!}
                  reasoning={reasoning}
                />

                <SharePanel
                  opinionText={opinionPiece}
                  selectedOption={selectedOption!}
                  reasoning={reasoning}
                />
              </div>
            )}
          </CardContent >
          <CardFooter className="flex justify-end border-t bg-gray-50 p-4">
            {!hasSubmitted && (
              <Button
                onClick={handleSubmit}
                disabled={loading || !selectedOption || !reasoning.trim() || !isAnimationComplete}
                className="bg-gray-900 hover:bg-black"
              >
                {loading ? "Submitting..." : "Submit Your Opinion"}
              </Button>
            )}
          </CardFooter>
        </Card >

        {/* Newspaper Footer */}
        < div className="bg-white border-t border-gray-300 mt-6 p-4 text-center text-sm text-gray-600" >
          <p>THE DEMOCRACY DAILY - Where Your Voice Matters</p>
          <p className="mt-1">All opinions expressed are subject to public discourse and democratic values.</p>
        </div >
      </div >
      <Toaster />
    </div >
  )
}
