"use client"

import { useState, useEffect } from 'react'

export interface TutorialState {
  isVisible: boolean
  currentTutorial: string | null
}

export function useTutorial() {
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    isVisible: false,
    currentTutorial: null
  })

  // Check if tutorial has been completed or skipped
  const hasTutorialBeenSeen = (tutorialKey: string): boolean => {
    if (typeof window === 'undefined') return false
    
    const completed = localStorage.getItem(`tutorial_${tutorialKey}_completed`) === 'true'
    const skipped = localStorage.getItem(`tutorial_${tutorialKey}_skipped`) === 'true'
    
    return completed || skipped
  }

  // Check if user is new (first time visiting)
  const isNewUser = (): boolean => {
    if (typeof window === 'undefined') return false
    
    const hasVisited = localStorage.getItem('hasVisited') === 'true'
    const hasInteracted = localStorage.getItem('hasInteracted') === 'true'
    
    return !hasVisited && !hasInteracted
  }

  // Check if user is guest (visiting without account)
  const isGuestUser = (): boolean => {
    if (typeof window === 'undefined') return false
    
    const hasInteracted = localStorage.getItem('hasInteracted') === 'true'
    const hasAccount = localStorage.getItem('userHasAccount') === 'true'
    
    return hasInteracted && !hasAccount
  }

  // Check if user has submitted their first opinion
  const hasSubmittedFirstOpinion = (): boolean => {
    if (typeof window === 'undefined') return false
    
    const allResponses = localStorage.getItem('all_responses')
    if (!allResponses) return false
    
    try {
      const responses = JSON.parse(allResponses)
      return responses.length > 0
    } catch {
      return false
    }
  }

  // Start a specific tutorial
  const startTutorial = (tutorialKey: string) => {
    if (hasTutorialBeenSeen(tutorialKey)) {
      return false // Tutorial already seen
    }
    
    setTutorialState({
      isVisible: true,
      currentTutorial: tutorialKey
    })
    
    return true // Tutorial started
  }

  // Complete current tutorial
  const completeTutorial = () => {
    setTutorialState({
      isVisible: false,
      currentTutorial: null
    })
  }

  // Skip current tutorial
  const skipTutorial = () => {
    setTutorialState({
      isVisible: false,
      currentTutorial: null
    })
  }

  // Auto-start tutorials based on user state
  const checkAndStartAppropriateDemo = () => {
    // Priority 1: First-time visitors (new users or guests)
    if (isNewUser() || (isGuestUser() && !hasTutorialBeenSeen('first_visit'))) {
      setTimeout(() => startTutorial('first_visit'), 1000)
      return
    }

    // Priority 2: After first submission
    if (hasSubmittedFirstOpinion() && !hasTutorialBeenSeen('post_submission')) {
      setTimeout(() => startTutorial('post_submission'), 500)
      return
    }
  }

  // Mark user as having visited
  const markUserAsVisited = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasVisited', 'true')
    }
  }

  // Force restart a tutorial (for testing)
  const restartTutorial = (tutorialKey: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`tutorial_${tutorialKey}_completed`)
      localStorage.removeItem(`tutorial_${tutorialKey}_skipped`)
    }
    startTutorial(tutorialKey)
  }

  // Reset all tutorials (for testing)
  const resetAllTutorials = () => {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('tutorial_')) {
          localStorage.removeItem(key)
        }
      })
    }
  }

  return {
    tutorialState,
    hasTutorialBeenSeen,
    isNewUser,
    isGuestUser,
    hasSubmittedFirstOpinion,
    startTutorial,
    completeTutorial,
    skipTutorial,
    checkAndStartAppropriateDemo,
    markUserAsVisited,
    restartTutorial,
    resetAllTutorials
  }
}