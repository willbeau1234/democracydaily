"use client"

import { useState, useEffect, useRef } from "react"

interface KaraokeTextProps {
  text: string
  onComplete: () => void
  speed?: number
}

export default function KaraokeText({ text, onComplete, speed = 1 }: KaraokeTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const words = text.split(" ")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const speedRef = useRef<number>(speed)
  const isFirstRenderRef = useRef(true) // Track first render
  
  // Function to calculate interval time
  const getIntervalTime = () => {
    return 400 / speedRef.current
  }
  
  // Function to create interval with current settings
  const createInterval = () => {
    return setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= words.length - 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          onComplete()
          return prev
        }
        return prev + 1
      })
    }, getIntervalTime())
  }
  
  // COMBINED EFFECT: handles both initialization and speed changes
  useEffect(() => {
    // Update speed reference
    speedRef.current = speed
    
    // If this is the first render or text changed, reset animation
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      setCurrentIndex(0) // Reset position only on first render or text change
    }
    
    // Always clear existing interval when speed or text changes
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    // Create new interval with current speed and continue from current position
    intervalRef.current = createInterval()
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [text, speed, words.length, onComplete])
  
  // Effect to reset animation when text changes
  useEffect(() => {
    // Reset state and ref when text changes
    setCurrentIndex(0)
    isFirstRenderRef.current = true
    
    // No need to handle intervals here - the combined effect will do that
  }, [text])

  return (
    <div className="text-xl leading-relaxed">
      {words.map((word, index) => (
        <span
          key={index}
          className={`inline-block mx-1 transition-all duration-300 ${
            index <= currentIndex ? "text-black font-medium" : "text-gray-400"
          } ${index === currentIndex ? "transform scale-110 text-gray-900 underline" : ""}`}
        >
          {word}
        </span>
      ))}
    </div>
  )
}