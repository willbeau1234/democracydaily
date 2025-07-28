"use client"

import React from 'react'
import Tutorial, { TutorialStep } from '@/components/Tutorial'

interface PostSubmissionTutorialProps {
  isVisible: boolean
  onComplete: () => void
  onSkip: () => void
}

export default function PostSubmissionTutorial({ isVisible, onComplete, onSkip }: PostSubmissionTutorialProps) {
  const steps: TutorialStep[] = [
    {
      id: 'congratulations',
      title: 'Great Job! 🎉',
      content: 'You\'ve successfully submitted your first opinion! Now let\'s explore the features that are now unlocked for you.',
      position: 'center'
    },
    {
      id: 'community_pulse',
      title: 'Community Pulse 📊',
      content: 'This shows the real-time voting results from all users. See how your community is responding to today\'s opinion with live percentage breakdowns.',
      targetElement: '[data-tutorial="community-pulse"]',
      position: 'top'
    },
    {
      id: 'word_clouds',
      title: 'Live Word Clouds ☁️',
      content: 'These dynamic word clouds are generated from everyone\'s reasoning. The larger the word, the more frequently it appears in responses. Watch them update in real-time!',
      targetElement: '[data-tutorial="word-clouds"]',
      position: 'top'
    },
    {
      id: 'agree_cloud',
      title: 'Agree Word Cloud ✅',
      content: 'This cloud shows the most common words and themes from people who agreed with the opinion. It helps you understand the "agree" perspective.',
      targetElement: '[data-tutorial="agree-cloud"]',
      position: 'right'
    },
    {
      id: 'disagree_cloud',
      title: 'Disagree Word Cloud ❌',
      content: 'This cloud shows the most common words and themes from people who disagreed. Compare it with the agree cloud to see different viewpoints.',
      targetElement: '[data-tutorial="disagree-cloud"]',
      position: 'left'
    },
    {
      id: 'ai_debate',
      title: 'AI vs Human Debate Simulator 🤖',
      content: 'Now for the exciting part! Test your reasoning against our AI. It will challenge your viewpoint and help you strengthen your arguments through interactive debate.',
      targetElement: '[data-tutorial="ai-debate-button"]',
      position: 'top'
    },
    {
      id: 'sharing',
      title: 'Share Your Voice 📢',
      content: 'Don\'t forget - you can share today\'s opinion on social media to get your friends involved in the democratic discussion!',
      targetElement: '[data-tutorial="sharing-buttons"]',
      position: 'top'
    },
    {
      id: 'daily_return',
      title: 'Come Back Tomorrow! 📅',
      content: 'You can only submit one opinion per day, but come back tomorrow for a new opinion to consider. Each day brings fresh perspectives and debates.',
      position: 'center'
    }
  ]

  return (
    <Tutorial
      steps={steps}
      isVisible={isVisible}
      onComplete={onComplete}
      onSkip={onSkip}
      tutorialKey="post_submission"
    />
  )
}