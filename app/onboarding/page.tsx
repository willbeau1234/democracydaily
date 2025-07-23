"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  ChevronDown, 
  Users, 
  TrendingUp, 
  Share2, 
  User,
  Sparkles,
  Eye,
  ArrowRight,
  CheckCircle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from 'next/navigation'

interface FeatureHighlight {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  position: { top: string; left: string }
  delay: number
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const router = useRouter()

  const features: FeatureHighlight[] = [
    {
      id: "header",
      title: "The Democracy Daily Header",
      description: "Your daily source for democratic discourse. Notice the newspaper-style design that makes civic engagement accessible and engaging.",
      icon: <Eye className="w-6 h-6" />,
      position: { top: "10%", left: "50%" },
      delay: 0
    },
    {
      id: "opinion-dropdown",
      title: "Opinion Section Dropdown",
      description: "Navigate between different sections like DIY, Profile, and Friends. This dropdown helps you explore all the platform's features.",
      icon: <ChevronDown className="w-6 h-6" />,
      position: { top: "15%", left: "85%" },
      delay: 1000
    },
    {
      id: "profile-opinions",
      title: "Profile Opinions Dropdown",
      description: "In your profile, access categorized opinions - Political Views, Social Issues, Economic Policy, and Environmental topics.",
      icon: <MessageSquare className="w-6 h-6" />,
      position: { top: "25%", left: "75%" },
      delay: 2000
    },
    {
      id: "daily-opinion",
      title: "Daily Opinion Card",
      description: "Read today's thought-provoking opinion piece with animated text. You can control the reading speed or skip ahead.",
      icon: <Sparkles className="w-6 h-6" />,
      position: { top: "40%", left: "50%" },
      delay: 3000
    },
    {
      id: "community-stats",
      title: "Live Community Pulse",
      description: "See real-time statistics of how the community is responding. Watch the percentage bars update as more people participate.",
      icon: <TrendingUp className="w-6 h-6" />,
      position: { top: "60%", left: "30%" },
      delay: 4000
    },
    {
      id: "word-clouds",
      title: "Dynamic Word Clouds",
      description: "Visualize community responses with live word clouds that grow and change as people share their reasoning.",
      icon: <Users className="w-6 h-6" />,
      position: { top: "70%", left: "70%" },
      delay: 5000
    },
    {
      id: "sharing",
      title: "Social Sharing",
      description: "Share your opinions across social platforms - Twitter, Facebook, Instagram, or copy to clipboard.",
      icon: <Share2 className="w-6 h-6" />,
      position: { top: "80%", left: "50%" },
      delay: 6000
    }
  ]

  const handleNext = () => {
    if (currentStep < features.length - 1) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
        setCompletedSteps([...completedSteps, currentStep])
        setIsAnimating(false)
      }, 300)
    } else {
      // Finished onboarding
      localStorage.setItem('hasSeenOnboarding', 'true')
      router.push('/')
    }
  }

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    router.push('/')
  }

  const currentFeature = features[currentStep]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-200 rounded-full opacity-30 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Floating navigation buttons */}
      <div className="fixed top-4 right-4 z-50 flex gap-3">
        <Button
          variant="outline"
          onClick={handleSkip}
          className="px-4 py-2 bg-white/90 backdrop-blur-sm border-2 hover:bg-white"
        >
          Skip Tour
        </Button>
        <Button
          onClick={handleNext}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
        >
          {currentStep === features.length - 1 ? (
            <>
              Get Started
              <CheckCircle className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to The Democracy Daily</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Let's take a quick tour of all the amazing features that make your voice heard in our democratic community
          </p>
          {/* Development reset button - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem('hasSeenOnboarding')
                window.location.reload()
              }}
              className="mt-2 text-xs text-gray-400"
            >
              Reset Onboarding (Dev)
            </Button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {features.length}
            </span>
            <div className="flex gap-2">
              {features.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    completedSteps.includes(index)
                      ? 'bg-green-500'
                      : index === currentStep
                      ? 'bg-purple-600 animate-pulse'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / features.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Demo interface */}
        <div className="max-w-6xl mx-auto relative">
          {/* Simulated Democracy Daily interface */}
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            {/* Simulated header */}
            <div className="bg-white border-b-4 border-black p-6 text-center relative">
              <h2 className="text-3xl font-bold font-serif tracking-tight">THE DEMOCRACY DAILY</h2>
              <div className="flex justify-between items-center text-sm text-gray-600 border-t border-b border-gray-300 py-2 px-4 my-2">
                <span>Vol. 1, No. 1</span>
                <span>Demo Mode</span>
                <div className="relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`flex items-center gap-1 transition-all duration-300 ${
                          currentStep === 1 ? 'bg-purple-100 border-2 border-purple-500 animate-pulse' : ''
                        }`}
                      >
                        Opinion Section
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Opinion Categories</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>📰 DIY</DropdownMenuItem>
                      <DropdownMenuItem>
                        <div className="flex items-center justify-between w-full">
                          👤 Profile
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className={`transition-all duration-300 ${
                                  currentStep === 2 ? 'bg-purple-100 border-2 border-purple-500 animate-pulse' : ''
                                }`}
                              >
                                <MessageSquare className="w-4 h-4" />
                                <ChevronDown className="w-3 h-3 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="left" className="w-48">
                              <DropdownMenuLabel>Opinion Categories</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Political Views</DropdownMenuItem>
                              <DropdownMenuItem>Social Issues</DropdownMenuItem>
                              <DropdownMenuItem>Economic Policy</DropdownMenuItem>
                              <DropdownMenuItem>Environmental</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem>🤝 Friends</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Simulated opinion card */}
            <div className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-xl font-serif">Opinion of the Day</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-serif text-lg italic">
                      "Democracy is not just about voting; it's about engaging in continuous dialogue with your community..."
                    </p>
                  </div>
                  
                  {/* Simulated voting buttons */}
                  <div className="flex justify-center gap-4">
                    <Button className="w-32 bg-green-500 hover:bg-green-600">Agree</Button>
                    <Button className="w-32 bg-red-500 hover:bg-red-600">Disagree</Button>
                  </div>

                  {/* Simulated stats */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-serif font-bold mb-2">Community Pulse</h4>
                    <div className="flex h-6 rounded overflow-hidden">
                      <div className="bg-green-500 flex-1 flex items-center justify-center text-white text-sm font-semibold">
                        68% Agree
                      </div>
                      <div className="bg-red-500 flex-1 flex items-center justify-center text-white text-sm font-semibold">
                        32% Disagree
                      </div>
                    </div>
                  </div>

                  {/* Simulated word clouds */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border rounded p-4 bg-white">
                      <h5 className="font-semibold mb-2">✅ Agree Word Cloud</h5>
                      <div className="h-32 bg-gradient-to-br from-green-50 to-green-100 rounded flex items-center justify-center">
                        <span className="text-green-700 font-semibold">Democracy Community Voice</span>
                      </div>
                    </div>
                    <div className="border rounded p-4 bg-white">
                      <h5 className="font-semibold mb-2">❌ Disagree Word Cloud</h5>
                      <div className="h-32 bg-gradient-to-br from-red-50 to-red-100 rounded flex items-center justify-center">
                        <span className="text-red-700 font-semibold">Complex Issues Debate</span>
                      </div>
                    </div>
                  </div>

                  {/* Simulated sharing */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-serif font-bold mb-2 flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Share Your Opinion
                    </h4>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Twitter</Button>
                      <Button variant="outline" size="sm">Facebook</Button>
                      <Button variant="outline" size="sm">Instagram</Button>
                      <Button variant="outline" size="sm">Copy</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Feature highlight overlay */}
          <div
            className={`absolute pointer-events-none transition-all duration-500 ${
              isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
            style={{
              top: currentFeature.position.top,
              left: currentFeature.position.left,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              {/* Pulsing highlight circle */}
              <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-30" 
                   style={{ width: '120px', height: '120px', transform: 'translate(-50%, -50%)', top: '50%', left: '50%' }} />
              <div className="absolute inset-0 bg-purple-500 rounded-full opacity-20" 
                   style={{ width: '100px', height: '100px', transform: 'translate(-50%, -50%)', top: '50%', left: '50%' }} />
              
              {/* Feature icon */}
              <div className="relative z-10 bg-white rounded-full p-4 shadow-lg border-4 border-purple-500">
                {currentFeature.icon}
              </div>
            </div>
          </div>
        </div>

        {/* Feature explanation card */}
        <div className="max-w-2xl mx-auto mt-8">
          <Card className={`shadow-lg transition-all duration-500 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="bg-purple-100 p-2 rounded-full">
                  {currentFeature.icon}
                </div>
                <CardTitle className="text-xl">{currentFeature.title}</CardTitle>
              </div>
              <Badge variant="secondary" className="mx-auto">
                Step {currentStep + 1} of {features.length}
              </Badge>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-lg text-gray-700 leading-relaxed">
                {currentFeature.description}
              </p>
              
              <div className="flex justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="px-6"
                >
                  Skip Tour
                </Button>
                <Button
                  onClick={handleNext}
                  className="px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {currentStep === features.length - 1 ? (
                    <>
                      Get Started
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}