"use client"

import React from 'react'
import Tutorial, { TutorialStep } from '@/components/Tutorial'

interface DebateSimulatorTutorialProps {
  isVisible: boolean
  onComplete: () => void
  onSkip: () => void
}

export default function DebateSimulatorTutorial({ isVisible, onComplete, onSkip }: DebateSimulatorTutorialProps) {
  const steps: TutorialStep[] = [
    {
      id: 'welcome_debate',
      title: 'Welcome to the Debate Arena! ⚔️',
      content: 'You\'re about to enter our AI vs Human debate simulator. This is where you can test and refine your arguments against artificial intelligence.',
      position: 'center'
    },
    {
      id: 'how_it_works',
      title: 'How It Works 🧠',
      content: 'The AI will read your original reasoning and present counter-arguments. You can respond, and it will adapt its strategy. It\'s like having a debate partner who never gets tired!',
      position: 'center'
    },
    {
      id: 'debate_interface',
      title: 'The Debate Interface 💬',
      content: 'You\'ll see your original opinion at the top, then a conversation-style interface where you and the AI exchange arguments. Each exchange helps you think deeper about the issue.',
      targetElement: '[data-tutorial="debate-interface"]',
      position: 'top'
    },
    {
      id: 'ai_response',
      title: 'AI Counter-Arguments 🤖',
      content: 'The AI will challenge your reasoning with logical counter-points, different perspectives, or questions about your assumptions. Stay thoughtful and engaged!',
      targetElement: '[data-tutorial="ai-response"]',
      position: 'left'
    },
    {
      id: 'your_response',
      title: 'Your Response 💭',
      content: 'Type your counter-response here. You can defend your original position, acknowledge valid points, or even change your mind. Good debates involve listening and adapting.',
      targetElement: '[data-tutorial="response-input"]',
      position: 'bottom'
    },
    {
      id: 'debate_tips',
      title: 'Debate Tips 💡',
      content: 'Stay respectful, use evidence when possible, consider multiple viewpoints, and don\'t be afraid to evolve your thinking. The goal is better understanding, not just winning.',
      position: 'center'
    },
    {
      id: 'end_debate',
      title: 'Ending the Debate 🏁',
      content: 'You can end the debate anytime by clicking "End Debate". This will take you back to the main Democracy Daily page where you can continue exploring other features.',
      targetElement: '[data-tutorial="end-debate-button"]',
      position: 'top'
    },
    {
      id: 'debate_summary',
      title: 'Debate Summary 📝',
      content: 'After the debate, you\'ll get a summary highlighting the strongest points from both sides and areas where your thinking might have evolved. Use this to inform future discussions!',
      position: 'center'
    }
  ]

  return (
    <Tutorial
      steps={steps}
      isVisible={isVisible}
      onComplete={onComplete}
      onSkip={onSkip}
      tutorialKey="debate_simulator"
    />
  )
}