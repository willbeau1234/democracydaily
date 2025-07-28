"use client"

import React from 'react'
import Tutorial, { TutorialStep } from '@/components/Tutorial'

interface FirstVisitTutorialProps {
  isVisible: boolean
  onComplete: () => void
  onSkip: () => void
}

export default function FirstVisitTutorial({ isVisible, onComplete, onSkip }: FirstVisitTutorialProps) {
  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Democracy Daily! 🗳️',
      content: 'Welcome to your daily dose of democratic discourse! Every day, we present a thought-provoking opinion for you to consider and debate.',
      position: 'center'
    },
    {
      id: 'daily_opinion',
      title: 'Daily Opinion Bar',
      content: 'This is where you\'ll find today\'s opinion piece. Click here to access the opinion dropdown and see previous opinions or navigate to different sections.',
      targetElement: '[data-tutorial="opinion-dropdown"]',
      position: 'bottom'
    },
    {
      id: 'opinion_piece',
      title: 'Today\'s Opinion',
      content: 'Each day features a new opinion on current events, policy, or social issues. Read it carefully and think about your stance.',
      targetElement: '[data-tutorial="opinion-text"]',
      position: 'top'
    },
    {
      id: 'voting_buttons',
      title: 'Make Your Voice Heard',
      content: 'After reading the opinion, choose whether you Agree or Disagree. Your vote contributes to the community discussion.',
      targetElement: '[data-tutorial="voting-buttons"]',
      position: 'top'
    },
    {
      id: 'reasoning',
      title: 'Share Your Thoughts',
      content: 'After selecting your stance, explain your reasoning. This helps create meaningful dialogue and contributes to the word clouds you\'ll see after submitting.',
      targetElement: '[data-tutorial="reasoning-textarea"]',
      position: 'top'
    },
    {
      id: 'submit',
      title: 'Submit Your Opinion',
      content: 'Once you\'ve shared your reasoning, submit your opinion to see how the community is responding and unlock additional features.',
      targetElement: '[data-tutorial="submit-button"]',
      position: 'top'
    },
    {
      id: 'whats_next',
      title: 'What Happens Next? 🎉',
      content: 'After submitting, you\'ll see the Community Pulse (voting results), live Word Clouds, and unlock our AI vs Human Debate Simulator. Let\'s get started!',
      position: 'center'
    }
  ]

  return (
    <Tutorial
      steps={steps}
      isVisible={isVisible}
      onComplete={onComplete}
      onSkip={onSkip}
      tutorialKey="first_visit"
    />
  )
}