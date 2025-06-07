"use client"

import { useState, useEffect, useRef } from "react"

interface TypewriterTextProps {
  text: string
  onComplete: () => void
  speed?: number
}

export default function TypewriterText({ text, onComplete, speed = 1 }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const speedRef = useRef<number>(speed)
  const isFirstRenderRef = useRef(true)

  // Safe text handling
  const safeText = text || ""

  // Function to calculate typing speed (characters per interval)
  const getTypingSpeed = () => {
    return Math.max(30, 100 / speedRef.current) // Faster = lower interval time
  }

  // Blinking cursor effect
  useEffect(() => {
    cursorIntervalRef.current = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530) // Blink every 530ms

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current)
      }
    }
  }, [])

  // Main typewriter effect
  useEffect(() => {
    if (!safeText) return; // Don't start if no text
    
    speedRef.current = speed

    // Reset on first render or text change
    if (isFirstRenderRef.current || safeText !== displayedText.substring(0, safeText.length)) {
      isFirstRenderRef.current = false
      setCurrentIndex(0)
      setDisplayedText("")
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Start typewriter animation
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1
        
        if (nextIndex > safeText.length) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
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
  }, [safeText, speed, onComplete])

  // Reset when text changes
  useEffect(() => {
    setCurrentIndex(0)
    setDisplayedText("")
    isFirstRenderRef.current = true
  }, [safeText])

  return (
    <div className="font-serif text-lg leading-relaxed">
      <span className="inline-block">
        {displayedText}
        <span 
          className={`inline-block w-0.5 h-6 bg-black ml-1 transition-opacity duration-100 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            animation: currentIndex >= safeText.length ? 'none' : undefined 
          }}
        />
      </span>
    </div>
  )
}