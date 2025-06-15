"use client"

import { useState, useEffect, useRef } from "react"

interface TypewriterTextProps {
  text: string
  onComplete: () => void
  speed?: number
  shouldSkip?: boolean
  onSkipped?: () => void
}

export default function TypewriterText({ 
  text, 
  onComplete, 
  speed = 1, 
  shouldSkip = false,
  onSkipped 
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const speedRef = useRef<number>(speed)
  const previousTextRef = useRef<string>("")

  // Safe text handling
  const safeText = text || ""

  // Update speed reference when speed prop changes (without restarting)
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  // Function to calculate typing speed (characters per interval)
  const getTypingSpeed = () => {
    return Math.max(30, 100 / speedRef.current)
  }

  // Handle skip when shouldSkip becomes true
  useEffect(() => {
    if (shouldSkip && !isComplete) {
      console.log("Skipping animation!")
      
      // Clear intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      // Set to complete state
      setDisplayedText(safeText)
      setCurrentIndex(safeText.length)
      setIsComplete(true)
      setShowCursor(false)
      
      // Call completion handlers
      onComplete()
      if (onSkipped) {
        onSkipped() // This will reset shouldSkip to false in parent
      }
    }
  }, [shouldSkip, isComplete, safeText, onComplete, onSkipped])

  // Blinking cursor effect
  useEffect(() => {
    if (isComplete) return

    cursorIntervalRef.current = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current)
      }
    }
  }, [isComplete])

  // Main typewriter effect
  useEffect(() => {
    // Reset when text changes
    if (previousTextRef.current !== safeText) {
      setCurrentIndex(0)
      setDisplayedText("")
      setIsComplete(false)
      setShowCursor(true)
      previousTextRef.current = safeText
    }

    // Don't start if no text or already complete
    if (!safeText || isComplete) {
      return
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Start animation
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1
        
        if (nextIndex > safeText.length) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          setIsComplete(true)
          setShowCursor(false)
          onComplete()
          return prevIndex
        }

        setDisplayedText(safeText.substring(0, nextIndex))
        return nextIndex
      })
    }, getTypingSpeed())

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [safeText, isComplete, onComplete])

  return (
    <div className="font-serif text-lg leading-relaxed">
      <span className="inline-block">
        {displayedText}
        <span
          className={`inline-block w-0.5 h-6 bg-black ml-1 transition-opacity duration-100 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </span>
    </div>
  )
}