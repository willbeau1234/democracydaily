"use server"

import { initializeApp } from "firebase/app"
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'

// Your Firebase config (copied from your firebase.ts)
const firebaseConfig = {
  apiKey: "AIzaSyDKKWP1baA8jgaVFZSyx2pHWMHHBLlHFvs",
  authDomain: "thedailydemocracy-37e55.firebaseapp.com",
  projectId: "thedailydemocracy-37e55",
  storageBucket: "thedailydemocracy-37e55.firebasestorage.app",
  messagingSenderId: "208931717554",
  appId: "1:208931717554:web:18e6f049b2622886d5a4ab",
  measurementId: "G-R1ZJFEYTBZ"
}

// Initialize Firebase for this server action
const firebaseApp = initializeApp(firebaseConfig, 'debate-simulator')
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() })
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" })

type Persona = "pro" | "con" | "moderator" | "judge"
type DebatePhase = "setup" | "opening" | "main" | "cross" | "closing" | "judgment"

interface DebateMessage {
  id: string
  persona: Persona
  content: string
  timestamp: Date
  phase: DebatePhase
}

const personaPrompts = {
  pro: `This should not be used - handled by user input`,
  con: `You are Jordan Smith, a skilled con debater. You oppose the given stance with strong counterarguments and evidence. You are analytical, critical, and excel at finding flaws in opposing arguments. Stay professional and persuasive. KEEP RESPONSES TO 4-6 SENTENCES. Be substantive and engaging.`,
  moderator: `You are Dr. Taylor, an experienced debate moderator. You maintain neutrality, ensure fair participation, and keep the discussion focused and productive. You guide the debate flow and ensure respectful discourse. KEEP RESPONSES TO 3-4 SENTENCES.`,
  judge: `You are Prof. Williams, an expert debate judge. You evaluate arguments objectively based on logic, evidence, argumentation quality, rebuttals, and overall engagement. You provide detailed, constructive feedback and fair scoring. You explain your reasoning clearly and offer suggestions for improvement.`,
}

export async function generateDebateResponse(
  persona: Persona,
  prompt: string,
  topic: string,
  stance: string,
  phase: DebatePhase,
  previousMessages: DebateMessage[],
): Promise<string> {
  console.log("🚀 Server action called with persona:", persona)
  console.log("🟢 Using Firebase Gemini in server action!")
  
  if (persona === "pro") {
    return "This should be handled by user input"
  }

  const systemPrompt = `${personaPrompts[persona]}

DEBATE TOPIC: "${topic}"
MAIN STANCE: "${stance}"
CURRENT PHASE: ${phase}

Instructions for this response: ${prompt}

IMPORTANT: Provide a substantive response between 200-600 characters. Be thorough but engaging.`

  try {
    console.log("🔄 Calling Firebase Gemini model...")
    console.log("🔧 Model initialized:", !!model)
    
    const result = await model.generateContent(systemPrompt)
    const response = result.response
    const text = response.text()

    console.log("✅ Firebase Gemini response:", text.substring(0, 100) + "...")
    return text.trim()
    
  } catch (geminiError: any) {
    console.error("❌ Firebase Gemini Error:", geminiError)
    console.error("❌ Full error:", JSON.stringify(geminiError, null, 2))
    return `I apologize, but I'm having trouble generating a response. Error: ${geminiError?.message}`
  }
}
