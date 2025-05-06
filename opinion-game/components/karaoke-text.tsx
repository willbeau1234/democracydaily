"use client"

import { useState, useEffect, useRef } from "react"

interface KaraokeTextProps {
  text: string
  onComplete: () => void
}

export default function KaraokeText({ text, onComplete }: KaraokeTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const words = text.split(" ")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Reset when text changes
    setCurrentIndex(0)

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Start the animation
    intervalRef.current = setInterval(() => {
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
    }, 600) // Adjust speed here

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [text, words.length, onComplete])

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
