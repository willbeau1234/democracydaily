"use client"
//test
import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Users, Trophy, MessageSquare, Send } from "lucide-react"
import { generateDebateResponse } from "./actions"  // ← Removed Server Action import
import { useRouter } from "next/navigation"
import { useTutorial } from '@/hooks/useTutorial'
import DebateSimulatorTutorial from '@/components/tutorials/DebateSimulatorTutorial'


type Persona = "pro" | "con" | "moderator" | "judge"
type DebatePhase = "setup" | "opening" | "main" | "cross" | "closing" | "judgment"

interface DebateMessage {
  id: string
  persona: Persona
  content: string
  timestamp: Date
  phase: DebatePhase
}

interface Scores {
  pro: {
    logic: number
    argumentation: number
    rebuttals: number
    engagement: number
  }
  con: {
    logic: number
    argumentation: number
    rebuttals: number
    engagement: number
  }
}

const getPersonaInfo = (userSide: "pro" | "con" | null) => {
  // User always defends their opinion (pro), AI always challenges it (con)
  return {
    pro: { name: "You", role: "Defending Your Opinion", color: "bg-green-100 text-green-800" },
    con: { name: "AI Challenger", role: "AI Opponent", color: "bg-red-100 text-red-800" },
    moderator: { name: "Dr. Taylor", role: "Moderator (AI)", color: "bg-blue-100 text-blue-800" },
    judge: { name: "Prof. Williams", role: "Judge (AI)", color: "bg-purple-100 text-purple-800" },
  }
}

const phaseNames = {
  setup: "Setup",
  opening: "Opening Statements",
  main: "Main Debate",
  cross: "Cross-Examination",
  closing: "Closing Arguments",
  judgment: "Final Judgment",
}

const parseJudgeScores = (judgmentText: string): Scores => {
  const defaultScores: Scores = {
    pro: { logic: 20, argumentation: 20, rebuttals: 20, engagement: 20 },
    con: { logic: 20, argumentation: 20, rebuttals: 20, engagement: 20 },
  }

  try {
    const scores: Scores = { 
      pro: { logic: 0, argumentation: 0, rebuttals: 0, engagement: 0 }, 
      con: { logic: 0, argumentation: 0, rebuttals: 0, engagement: 0 } 
    }
    
    // More flexible section matching
    const proSection = judgmentText.match(/PRO\s+SCORES?[^:]*:?\s*((?:.*?\n?)*?)(?=CON\s+SCORES?|OPPOSITION\s+SCORES?|WINNER|$)/is)
    const conSection = judgmentText.match(/(?:CON\s+SCORES?|OPPOSITION\s+SCORES?)[^:]*:?\s*((?:.*?\n?)*?)(?=WINNER|CONCLUSION|$)/is)

    if (proSection && proSection[1]) {
      const proText = proSection[1]
      scores.pro.logic = extractScore(proText, /(?:Logic|Logic\s*&\s*Evidence)[^:]*:\s*(\d+)/i) ?? defaultScores.pro.logic
      scores.pro.argumentation = extractScore(proText, /Argumentation[^:]*:\s*(\d+)/i) ?? defaultScores.pro.argumentation
      scores.pro.rebuttals = extractScore(proText, /Rebuttals?[^:]*:\s*(\d+)/i) ?? defaultScores.pro.rebuttals
      scores.pro.engagement = extractScore(proText, /Engagement[^:]*:\s*(\d+)/i) ?? defaultScores.pro.engagement
    } else {
      scores.pro.logic = extractScore(judgmentText, /(?:proposition|pro).*?(?:logic|evidence).*?(\d+)/i) || defaultScores.pro.logic
      scores.pro.argumentation = extractScore(judgmentText, /(?:proposition|pro).*?argumentation.*?(\d+)/i) || defaultScores.pro.argumentation
      scores.pro.rebuttals = extractScore(judgmentText, /(?:proposition|pro).*?rebuttals?.*?(\d+)/i) || defaultScores.pro.rebuttals
      scores.pro.engagement = extractScore(judgmentText, /(?:proposition|pro).*?engagement.*?(\d+)/i) || defaultScores.pro.engagement
    }

    if (conSection && conSection[1]) {
      const conText = conSection[1]
      scores.con.logic = extractScore(conText, /(?:Logic|Logic\s*&\s*Evidence)[^:]*:\s*(\d+)/i) || defaultScores.con.logic
      scores.con.argumentation = extractScore(conText, /Argumentation[^:]*:\s*(\d+)/i) || defaultScores.con.argumentation
      scores.con.rebuttals = extractScore(conText, /Rebuttals?[^:]*:\s*(\d+)/i) || defaultScores.con.rebuttals
      scores.con.engagement = extractScore(conText, /Engagement[^:]*:\s*(\d+)/i) || defaultScores.con.engagement
    } else {
      scores.con.logic = extractScore(judgmentText, /(?:opposition|con).*?(?:logic|evidence).*?(\d+)/i) || defaultScores.con.logic
      scores.con.argumentation = extractScore(judgmentText, /(?:opposition|con).*?argumentation.*?(\d+)/i) || defaultScores.con.argumentation
      scores.con.rebuttals = extractScore(judgmentText, /(?:opposition|con).*?rebuttals?.*?(\d+)/i) || defaultScores.con.rebuttals
      scores.con.engagement = extractScore(judgmentText, /(?:opposition|con).*?engagement.*?(\d+)/i) || defaultScores.con.engagement
    }

    return scores
  } catch (error) {
    return defaultScores
  }
}

const extractScore = (text: string, pattern: RegExp): number | null => {
  const match = text.match(pattern)
  if (match && match[1]) {
    const score = parseInt(match[1])
    const isValid = (score >= 0 && score <= 25)
    console.log(`  Score found: ${score} (valid: ${isValid}) for pattern: ${pattern}`)
    console.log(`  Match: "${match[0]}"`)
    return isValid ? score : null
  }
  return null
}

// Separate component that uses useSearchParams
function VirtualDebateSimulationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Tutorial system
  const {
    tutorialState,
    startTutorial,
    completeTutorial,
    skipTutorial,
    hasTutorialBeenSeen
  } = useTutorial()
  
  // Get debate data from URL parameters
  const opinionOfTheDay = searchParams.get('opinionOfTheDay') || "No topic provided"
  const personOpinion = searchParams.get('personOpinion') || "No opinion provided"
  
  // Use the opinion of the day as the topic and person's reasoning as their stance
  const [topic] = useState(opinionOfTheDay)
  const [stance] = useState(personOpinion)
  
  // User always defends their own opinion (pro), AI argues against it (con)
  const [userSide] = useState<"pro">("pro")
  const [messages, setMessages] = useState<DebateMessage[]>([])
  const [currentPhase, setCurrentPhase] = useState<DebatePhase>("setup")
  const [currentSpeaker, setCurrentSpeaker] = useState<Persona>("moderator")
  const [round, setRound] = useState(1)
  const [scores, setScores] = useState<Scores>({
    pro: { logic: 0, argumentation: 0, rebuttals: 0, engagement: 0 },
    con: { logic: 0, argumentation: 0, rebuttals: 0, engagement: 0 },
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [debateStarted, setDebateStarted] = useState(false)
  const [userInput, setUserInput] = useState("")
  const [waitingForUser, setWaitingForUser] = useState(false)
  const [userPrompt, setUserPrompt] = useState("")

  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isGenerating])

  // Auto-start the debate when component loads
  useEffect(() => {
    if (!debateStarted && topic && stance && topic !== "No topic provided") {
      startDebate()
    }
  }, [debateStarted, topic, stance])

  // Start tutorial when debate starts
  useEffect(() => {
    if (debateStarted && !hasTutorialBeenSeen('debate_simulator')) {
      setTimeout(() => {
        startTutorial('debate_simulator')
      }, 2000)
    }
  }, [debateStarted])

  const addMessage = (persona: Persona, content: string, phase: DebatePhase) => {
    const newMessage: DebateMessage = {
      id: Date.now().toString(),
      persona,
      content,
      timestamp: new Date(),
      phase,
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const startDebate = async () => {
    setDebateStarted(true)
    setCurrentPhase("opening")
    setIsGenerating(true)

    const moderatorIntro = await generateDebateResponse(
      "moderator",
      `Welcome to today's debate on: "${topic}". A human participant has shared their opinion: "${stance}". The human will defend and elaborate on their viewpoint, while an AI challenger will present counterarguments and alternative perspectives. Please introduce the debate format and the participants.`,
      topic,
      stance,
      "opening",
      [],
    )

    addMessage("moderator", moderatorIntro, "opening")
    setCurrentSpeaker("pro") // User always starts since they're defending their opinion
    setWaitingForUser(true)
    
    // Pre-fill the user's input with their original reasoning
    setUserInput(stance)
    setUserPrompt(`Here's your original reasoning (feel free to edit and expand): "${stance}". Elaborate on your opinion, explain your reasoning in more detail, and provide supporting evidence and examples. You have 3 minutes to make your case.`)
    setIsGenerating(false)
  }

  const handleUserSubmit = async () => {
    if (!userInput.trim() || !waitingForUser) return

    // Add user's message
    addMessage("pro", userInput, currentPhase) // User is always "pro" (defending their opinion)
    const userMessage = userInput
    setUserInput("")
    setWaitingForUser(false)

    // AI is always "con" (challenging the user's opinion)
    let nextSpeaker: Persona = "con"
    let nextPhase = currentPhase

    if (currentPhase === "opening") {
      nextPhase = "main"
    } else if (currentPhase === "main" && currentSpeaker === "pro") {
      if (round >= 3) {
        nextPhase = "cross"
      } else {
        setRound(prev => prev + 1)
      }
    } else if (currentPhase === "cross" && currentSpeaker === "pro") {
      nextSpeaker = "moderator"
      nextPhase = "closing"
    } else if (currentPhase === "closing" && currentSpeaker === "pro") {
      nextSpeaker = "judge"
      nextPhase = "judgment"
    }

    setCurrentSpeaker(nextSpeaker)
    setCurrentPhase(nextPhase)

    // Generate AI response if not waiting for user
    if (nextSpeaker !== "pro") {
      const updatedMessages: DebateMessage[] = [...messages, {
        id: Date.now().toString(),
        persona: "pro" as Persona,  // Explicit type assertion
        content: userMessage,
        timestamp: new Date(),
        phase: currentPhase
      }]
      generateNextResponseWithMessages(updatedMessages)
    }
  }

  const generateNextResponse = async () => {
    generateNextResponseWithMessages(messages)
  }

  const generateNextResponseWithMessages = async (messageHistory: DebateMessage[]) => {
    if (isGenerating || waitingForUser) return

    setIsGenerating(true)

    // AI is always "con" (challenging the user's opinion)
    let prompt = ""
    let nextSpeaker: Persona = "moderator"
    let nextPhase = currentPhase

    if (currentPhase === "opening" && currentSpeaker === "con") {
      prompt = `Challenge the human's opinion: "${stance}". Present strong counterarguments, alternative perspectives, and evidence that contradicts or questions their viewpoint. Be respectful but thorough in your opposition. You have 3 minutes to make your case against their position.`
      nextSpeaker = "moderator"
      nextPhase = "main"
    } else if (currentPhase === "main") {
      if (currentSpeaker === "moderator") {
        prompt = `Transition to the main debate rounds. Ask a probing question or highlight key points that need addressing. Keep the debate focused and productive.`
        nextSpeaker = round % 2 === 1 ? "pro" : "con"
      } else if (currentSpeaker === "con") {
        prompt = `Continue challenging the human's position for round ${round}. Address any new points they've made and present fresh counterarguments with supporting evidence and examples. Be thorough and persuasive in your opposition.`
        nextSpeaker = "moderator"
        if (round >= 3) {
          nextPhase = "cross"
        } else {
          setRound((prev) => prev + 1)
        }
      }
    } else if (currentPhase === "cross") {
      if (currentSpeaker === "moderator") {
        prompt = `Begin the cross-examination phase. Explain the rules and ask a pointed question that both sides should address. Focus on the core disagreement between the human's opinion and the AI's challenges.`
        nextSpeaker = "pro"
      } else if (currentSpeaker === "con") {
        prompt = `Answer the human's question thoroughly, then ask your own challenging questions back to them. Focus on exposing potential weaknesses or inconsistencies in their position with specific examples.`
        nextSpeaker = "moderator"
        nextPhase = "closing"
      }
    } else if (currentPhase === "closing") {
      if (currentSpeaker === "moderator") {
        prompt = `Transition to closing arguments. Summarize the key points discussed and give instructions for final statements. Set the stage for powerful conclusions.`
        nextSpeaker = "pro"
      } else if (currentSpeaker === "con") {
        prompt = `Give your closing argument challenging the human's opinion. Summarize your strongest counterpoints, address their main arguments, and make your final case for why their position may be flawed or incomplete. This is your last chance to present your opposition.`
        nextSpeaker = "judge"
        nextPhase = "judgment"
      }
    } else if (currentPhase === "judgment") {
      prompt = `Evaluate the entire debate and provide scores in this EXACT format:

PRO SCORES (Human - Defending Their Opinion):
Logic & Evidence: X/25
Argumentation: X/25
Rebuttals: X/25
Engagement: X/25

CON SCORES (AI - Challenging the Opinion):
Logic & Evidence: X/25
Argumentation: X/25
Rebuttals: X/25
Engagement: X/25

WINNER: [PRO Side/CON Side]

Then provide detailed feedback explaining your decision, highlighting the strongest arguments from each side, and offering constructive suggestions for improvement.`
      nextSpeaker = "judge"
    }

    const response = await generateDebateResponse(currentSpeaker, prompt, topic, stance, currentPhase, messageHistory)
    addMessage(currentSpeaker, response, currentPhase)

    if (currentSpeaker === "judge" && currentPhase === "judgment") {
      const extractedScores = parseJudgeScores(response)
      setScores(extractedScores)
    }

    setCurrentSpeaker(nextSpeaker)
    setCurrentPhase(nextPhase)

    // Check if next speaker should be user
    if (nextSpeaker === "pro" && nextPhase !== "judgment") {
      setWaitingForUser(true)
      if (nextPhase === "main") {
        setUserPrompt(`Continue defending your opinion for round ${round}. Address the AI's challenges and strengthen your position with new evidence, examples, or reasoning. Show why your viewpoint remains valid.`)
      } else if (nextPhase === "cross") {
        setUserPrompt("Ask direct, challenging questions to the AI about their counterarguments. Focus on potential weaknesses, contradictions, or gaps in their challenges to your opinion.")
      } else if (nextPhase === "closing") {
        setUserPrompt("Give your closing argument defending your opinion. Summarize why your position is correct, address the main challenges raised by the AI, and make your final persuasive case.")
      }
    }

    setIsGenerating(false)
  }

  const getTotalScore = (side: "pro" | "con") => {
    return Object.values(scores[side]).reduce((sum, score) => sum + score, 0)
  }

  const getPhaseProgress = () => {
    const phases = ["setup", "opening", "main", "cross", "closing", "judgment"]
    return ((phases.indexOf(currentPhase) + 1) / phases.length) * 100
  }

  // Show error if no debate data
  if (!opinionOfTheDay || opinionOfTheDay === "No topic provided") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">No Debate Data</h2>
            <p className="text-sm text-gray-600 mb-4">Please return to Democracy Daily and submit your opinion first.</p>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Go Back to Democracy Daily
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading while debate is starting
  if (!debateStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Starting Debate</h2>
            <p className="text-sm text-gray-600 mb-4">You'll be defending your opinion:</p>
            <p className="text-base font-medium text-gray-800 mb-2">{topic}</p>
            <p className="text-sm text-gray-600">Your stance: <span className="font-medium">{stance}</span></p>
            <p className="text-xs text-gray-500 mt-4">The AI will challenge your viewpoint</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const personaInfo = getPersonaInfo(userSide)

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Defend Your Opinion vs AI</h1>
                <p className="text-sm sm:text-base text-gray-600 break-words leading-relaxed">{topic}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 text-xs sm:text-sm whitespace-nowrap">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {phaseNames[currentPhase]}
                </Badge>
                {currentPhase === "main" && <Badge variant="outline" className="text-xs sm:text-sm">Round {round}</Badge>}
                <Button 
                  onClick={() => {
                    // End debate and return to main page instead of starting new debate
                    router.push('/')
                  }} 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  data-tutorial="end-debate-button"
                >
                  End Debate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                <span>Debate Progress</span>
                <span>{Math.round(getPhaseProgress())}%</span>
              </div>
              <Progress value={getPhaseProgress()} className="h-1 sm:h-2" />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-3 sm:gap-6">
          {/* Main Debate Area */}
          <div className="lg:col-span-3 order-1">
            <Card className="flex flex-col">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center space-x-2 text-sm sm:text-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Debate Floor</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-2 sm:p-6 pt-0">
                <div className="max-h-[60vh] sm:max-h-[70vh] lg:max-h-[75vh] overflow-y-auto space-y-3 sm:space-y-4 mb-3 sm:mb-4 min-h-[300px]" data-tutorial="debate-interface">
                  {messages.map((message) => (
                    <div key={message.id} className="flex space-x-2 sm:space-x-3">
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${personaInfo[message.persona].color} flex-shrink-0`}
                      >
                        <span className="hidden sm:inline">{personaInfo[message.persona].name}</span>
                        <span className="sm:hidden">{personaInfo[message.persona].name.split(' ')[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div 
                          className="bg-gray-50 rounded-lg p-3"
                          data-tutorial={message.persona === 'con' ? 'ai-response' : undefined}
                        >
                          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-col sm:flex-row sm:space-x-2">
                          <span>{message.timestamp.toLocaleTimeString()}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{phaseNames[message.phase]}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isGenerating && (
                    <div className="flex space-x-2 sm:space-x-3">
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${personaInfo[currentSpeaker].color} flex-shrink-0`}
                      >
                        <span className="hidden sm:inline">{personaInfo[currentSpeaker].name}</span>
                        <span className="sm:hidden">{personaInfo[currentSpeaker].name.split(' ')[0]}</span>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-gray-600">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Auto-scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>

                {waitingForUser ? (
                  <div className="space-y-3 bg-white rounded-lg border border-gray-200 p-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800 font-medium">Your Turn!</p>
                      <p className="text-sm text-green-600 mt-1">{userPrompt}</p>
                    </div>
                    <div className="space-y-2">
                      <Textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Type your argument here..."
                        className="w-full min-h-[80px] text-sm resize-none"
                        data-tutorial="response-input"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleUserSubmit()
                          }
                        }}
                      />
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                        <p className="text-xs text-gray-500">Tip: Press Ctrl+Enter to send</p>
                        <Button 
                          onClick={handleUserSubmit} 
                          disabled={!userInput.trim()}
                          className="w-full sm:w-auto"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Response
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : currentPhase !== "judgment" || currentSpeaker !== "judge" || !messages.some(m => m.persona === "judge" && m.phase === "judgment") ? (
                  <Button onClick={generateNextResponse} disabled={isGenerating} className="w-full">
                    {isGenerating ? "AI is thinking..." : (
                      <span className="flex items-center justify-center">
                        <span className="hidden sm:inline">Continue Debate ({personaInfo[currentSpeaker].name})</span>
                        <span className="sm:hidden">Continue ({personaInfo[currentSpeaker].name.split(' ')[0]})</span>
                      </span>
                    )}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-3 sm:space-y-6 order-2 lg:order-2">
            {/* Current Speaker */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Current Speaker</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center">
                  <div
                    className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                      waitingForUser ? "bg-green-100 text-green-800" : personaInfo[currentSpeaker].color
                    }`}
                  >
                    {waitingForUser ? "Your Turn" : personaInfo[currentSpeaker].name}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {waitingForUser ? "Defending Your Opinion" : personaInfo[currentSpeaker].role}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Scoring */}
            {currentPhase === "judgment" && getTotalScore("pro") > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Final Scores</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-4 sm:block sm:space-y-4">
                    <div className="sm:block">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm text-green-700">
                          Your Score (Defending)
                        </span>
                        <span className="font-bold text-lg text-green-700">
                          {getTotalScore("pro")}/100
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Logic:</span>
                          <span className="font-medium">{scores.pro.logic}/25</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Arguments:</span>
                          <span className="font-medium">{scores.pro.argumentation}/25</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rebuttals:</span>
                          <span className="font-medium">{scores.pro.rebuttals}/25</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Engagement:</span>
                          <span className="font-medium">{scores.pro.engagement}/25</span>
                        </div>
                      </div>
                    </div>

                    <div className="sm:border-t sm:pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm text-red-700">
                          AI Score (Challenging)
                        </span>
                        <span className="font-bold text-lg text-red-700">
                          {getTotalScore("con")}/100
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Logic:</span>
                          <span className="font-medium">{scores.con.logic}/25</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Arguments:</span>
                          <span className="font-medium">{scores.con.argumentation}/25</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rebuttals:</span>
                          <span className="font-medium">{scores.con.rebuttals}/25</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Engagement:</span>
                          <span className="font-medium">{scores.con.engagement}/25</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {getTotalScore("pro") !== getTotalScore("con") && (
                    <div className="text-center pt-3 border-t col-span-2 sm:col-span-1">
                      <Badge
                        className={`text-sm px-4 py-2 ${
                          getTotalScore("pro") > getTotalScore("con")
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        🏆 Winner: {getTotalScore("pro") > getTotalScore("con") ? "You!" : "AI Challenger"}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Debate Rules */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Debate Structure</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className={`p-2 rounded-lg ${currentPhase === "opening" ? "bg-blue-100 border border-blue-200" : "bg-gray-50"}`}>
                    <div className="font-medium">Opening Statements</div>
                    <div className="text-xs text-gray-600">3 minutes each side</div>
                  </div>
                  <div className={`p-2 rounded-lg ${currentPhase === "main" ? "bg-blue-100 border border-blue-200" : "bg-gray-50"}`}>
                    <div className="font-medium">Main Debate</div>
                    <div className="text-xs text-gray-600">3-4 rounds of arguments</div>
                  </div>
                  <div className={`p-2 rounded-lg ${currentPhase === "cross" ? "bg-blue-100 border border-blue-200" : "bg-gray-50"}`}>
                    <div className="font-medium">Cross-Examination</div>
                    <div className="text-xs text-gray-600">Direct questions</div>
                  </div>
                  <div className={`p-2 rounded-lg ${currentPhase === "closing" ? "bg-blue-100 border border-blue-200" : "bg-gray-50"}`}>
                    <div className="font-medium">Closing Arguments</div>
                    <div className="text-xs text-gray-600">Final statements</div>
                  </div>
                  <div className={`p-2 rounded-lg ${currentPhase === "judgment" ? "bg-blue-100 border border-blue-200" : "bg-gray-50"}`}>
                    <div className="font-medium">Final Judgment</div>
                    <div className="text-xs text-gray-600">Scoring & feedback</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="mt-8 border-t pt-6">
        <div className="flex justify-center">
          <button 
            onClick={() => router.push('/')}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors shadow-lg"
          >
            🏠 Back to Main Page
          </button>
        </div>
      </div>
    </div>
    
    {/* Tutorial Component */}
    <DebateSimulatorTutorial
      isVisible={tutorialState.isVisible && tutorialState.currentTutorial === 'debate_simulator'}
      onComplete={completeTutorial}
      onSkip={skipTutorial}
    />
  </div>
  )
}

// Main component with Suspense wrapper
export default function VirtualDebateSimulation() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Debate...</h2>
            <p className="text-sm text-gray-600">Preparing your virtual debate experience</p>
          </CardContent>
        </Card>
      </div>
    }>
      <VirtualDebateSimulationContent />
    </Suspense>
  )
}