"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"

interface AIvsHumanButtonProps {
  personOpinion?: string;
  opinionOfTheDay?: string;
}

const AIvsHumanButton = ({ personOpinion, opinionOfTheDay }: AIvsHumanButtonProps) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [battlePhase, setBattlePhase] = useState(0)
  const [clickCount, setClickCount] = useState(0)

  // Auto-start animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Battle animation cycle
  useEffect(() => {
    if (!isAnimating) return

    const interval = setInterval(() => {
      setBattlePhase(prev => (prev + 1) % 4)
    }, 800)

    return () => clearInterval(interval)
  }, [isAnimating])

  const handleClick = () => {
    setClickCount(prev => prev + 1)
    
    // Add some fun responses
    if (clickCount === 0) {
      console.log("🤖 vs 👤 The battle begins!")
    } else if (clickCount === 3) {
      console.log("🎉 You've started an epic debate!")
    }
    
    // After a short delay to show the click animation, navigate to debate simulator
    setTimeout(() => {
      // Encode the opinions as URL parameters
      const params = new URLSearchParams({
        personOpinion: personOpinion || '',
        opinionOfTheDay: opinionOfTheDay || ''
      })
      
      // Navigate to debate simulator with the opinions
      // You can replace this with your preferred navigation method
      // For React Router: navigate(`/debate-simulator?${params}`)
      // For Next.js: router.push(`/debate-simulator?${params}`)
      // For now using window.location:
      window.location.href = `/debate-simulator?${params}`
    }, 500) // 500ms delay to show the click effect
  }

  const getBattleEmoji = () => {
    switch (battlePhase) {
      case 0: return { ai: "🤖", human: "👤", vs: "⚔️" }
      case 1: return { ai: "🧠", human: "💭", vs: "💥" }
      case 2: return { ai: "⚡", human: "🔥", vs: "⭐" }
      case 3: return { ai: "🎯", human: "🎪", vs: "🌟" }
      default: return { ai: "🤖", human: "👤", vs: "⚔️" }
    }
  }

  const { ai, human, vs } = getBattleEmoji()

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-center mb-2">
        <h3 className="font-serif text-base sm:text-lg font-semibold text-gray-800 mb-1">
          Ready for the ultimate showdown?
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 font-serif">
          Experience AI vs Human debates like never before
        </p>
      </div>

      <Button
        onClick={handleClick}
        className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-black to-gray-900 hover:from-gray-800 hover:via-gray-900 hover:to-gray-800 text-white font-bold text-lg sm:text-xl px-6 py-16 sm:px-16 sm:py-28 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-gray-700"
      >
        {/* Animated background pulse */}
        <div className={`absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 opacity-20 ${isAnimating ? 'animate-pulse' : ''}`} />
        
        {/* Main content */}
        <div className="relative flex items-center justify-center">
          {/* AI Side */}
          <div className={`flex flex-col items-center w-12 sm:w-20 transition-transform duration-500 ${isAnimating && battlePhase % 2 === 0 ? 'scale-125 -rotate-12' : ''}`}>
            <span className="text-2xl sm:text-3xl">{ai}</span>
            <span className="text-xs sm:text-sm font-serif mt-1">AI</span>
          </div>

          {/* VS Symbol */}
          <div className={`flex flex-col items-center w-12 sm:w-20 mx-2 sm:mx-3 transition-all duration-300 ${isAnimating ? 'animate-bounce' : ''}`}>
            <span className="text-3xl sm:text-4xl">{vs}</span>
            <span className="text-xs sm:text-sm font-serif mt-1">VS</span>
          </div>

          {/* Human Side */}
          <div className={`flex flex-col items-center w-12 sm:w-20 transition-transform duration-500 ${isAnimating && battlePhase % 2 === 1 ? 'scale-125 rotate-12' : ''}`}>
            <span className="text-2xl sm:text-3xl">{human}</span>
            <span className="text-xs sm:text-sm font-serif mt-1">HUMAN</span>
          </div>
        </div>

        {/* Energy waves */}
        {isAnimating && (
          <>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse opacity-60" />
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse opacity-60" />
          </>
        )}

        {/* Particle effects */}
        {isAnimating && (
          <div className="absolute inset-0">
            <div className="absolute top-4 left-8 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-70" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-6 right-10 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-70" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-70" style={{ animationDelay: '1.5s' }} />
            <div className="absolute bottom-4 right-8 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-70" style={{ animationDelay: '2s' }} />
          </div>
        )}
      </Button>

      {/* Dynamic status text */}
      <div className="text-center">
        {!isAnimating ? (
          <p className="text-sm text-gray-500 font-serif italic">
            Click to start the epic debate with your opinion!
          </p>
        ) : (
          <p className="text-sm text-gray-700 font-serif font-semibold animate-pulse">
            🚀 Loading AI vs Human debate arena...
          </p>
        )}
      </div>

      {/* Battle stats */}
      {clickCount > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 border-2 border-dashed border-gray-300">
          <div className="flex justify-center space-x-6 text-xs font-serif">
            <div className="text-center">
              <div className="font-bold text-gray-800">🤖 AI</div>
              <div className="text-gray-600">Ready</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-900">⚡ ENERGY</div>
              <div className="text-gray-600">{Math.min(clickCount * 25, 100)}%</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-800">👤 HUMAN</div>
              <div className="text-gray-600">Ready</div>
            </div>
          </div>
        </div>
      )}

      {/* Fun interaction counter */}
      {clickCount >= 5 && (
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-400 rounded-lg p-2">
          <p className="text-xs text-center font-serif text-gray-800">
            🎉 Wow! You've really charged up the debate energy! 
            <br />
            <span className="font-bold">Coming soon: Full AI vs Human debate arena!</span>
          </p>
        </div>
      )}
    </div>
  )
}

export default AIvsHumanButton