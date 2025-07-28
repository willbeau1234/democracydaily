"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react'

export interface TutorialStep {
  id: string
  title: string
  content: string
  targetElement?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  image?: string
  action?: () => void
}

export interface TutorialProps {
  steps: TutorialStep[]
  isVisible: boolean
  onComplete: () => void
  onSkip: () => void
  tutorialKey: string
}

export default function Tutorial({ steps, isVisible, onComplete, onSkip, tutorialKey }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [overlay, setOverlay] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  useEffect(() => {
    if (isVisible && steps[currentStep]?.targetElement) {
      const element = document.querySelector(steps[currentStep].targetElement!)
      if (element) {
        const rect = element.getBoundingClientRect()
        setOverlay({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        })
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentStep, steps, isVisible])

  const nextStep = () => {
    if (steps[currentStep]?.action) {
      steps[currentStep].action!()
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tutorial_${tutorialKey}_completed`, 'true')
    }
    onComplete()
  }

  const handleSkip = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tutorial_${tutorialKey}_skipped`, 'true')
    }
    onSkip()
  }

  if (!isVisible || steps.length === 0) return null

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Spotlight effect for target elements */}
      {overlay && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: overlay.x - 4,
            top: overlay.y - 4,
            width: overlay.width + 8,
            height: overlay.height + 8,
            border: '3px solid #3b82f6',
            borderRadius: '8px',
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.5)',
            animation: 'pulse 2s infinite'
          }}
        />
      )}

      {/* Tutorial modal */}
      <div className="fixed inset-4 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-2xl">
          <CardHeader className="relative">
            <button
              onClick={handleSkip}
              className="absolute right-2 top-2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
            <CardTitle className="font-serif text-lg pr-8">
              {currentStepData.title}
            </CardTitle>
            <div className="flex items-center gap-1 mt-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded ${
                    index <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Step {currentStep + 1} of {steps.length}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {currentStepData.image && (
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <img 
                  src={currentStepData.image} 
                  alt={currentStepData.title}
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>
            )}
            
            <p className="font-serif text-sm leading-relaxed">
              {currentStepData.content}
            </p>
            
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <Button
                onClick={nextStep}
                className="text-sm bg-blue-600 hover:bg-blue-700"
              >
                {isLastStep ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-center pt-2">
              <button
                onClick={handleSkip}
                className="text-xs text-gray-500 hover:text-gray-700 underline font-serif"
              >
                Skip tutorial
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.2), 0 0 25px rgba(59, 130, 246, 0.7);
          }
        }
      `}</style>
    </>
  )
}