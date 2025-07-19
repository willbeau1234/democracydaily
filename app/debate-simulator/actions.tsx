"use server"

import { geminiModel } from '@/lib/firebase';  // Using your existing setup

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

// Your existing Gemini function adapted for our use
async function askGemini(question: string) {
  try {
    const result = await geminiModel.generateContent(question);
    const responseText = result.response.text();
    console.log("✅ Gemini's answer:", responseText.substring(0, 100) + "...");
    return responseText;
  } catch (error) {
    console.error("❌ Error asking Gemini:", error);
    throw error; // Re-throw so we can handle it properly
  }
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
  console.log("🟢 Using Gemini AI instead of OpenAI!")
  
  if (persona === "pro") {
    console.log("⚠️ Pro persona requested - should be handled by user input")
    return "This should be handled by user input"
  }

  console.log("📝 Topic:", topic)
  console.log("📝 Phase:", phase)

  const context = previousMessages.length > 0
    ? `\n\nPrevious discussion:\n${previousMessages
        .slice(-5)
        .map((m) => `${m.persona}: ${m.content}`)
        .join("\n\n")}`
    : ""

  const systemPrompt = `${personaPrompts[persona]}

DEBATE TOPIC: "${topic}"
MAIN STANCE: "${stance}"
CURRENT PHASE: ${phase}

${context}

Instructions for this response: ${prompt}

IMPORTANT: Provide a substantive response between 200-600 characters. Be thorough but engaging.`

  try {
    console.log("🔄 Calling Gemini...")
    
    // Use your existing askGemini function
    const text = await askGemini(systemPrompt)

    console.log("📝 Raw Gemini response:", text.substring(0, 100) + "...")

    // Smart truncation
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    let truncated = ''
    let sentenceCount = 0

    for (const sentence of sentences) {
      const potential = truncated + sentence.trim() + '. '
      if (potential.length > 700 || sentenceCount >= 5) {
        break
      }
      truncated = potential
      sentenceCount++
    }

    if (truncated.length < 100 && sentences.length > 0) {
      truncated = sentences.slice(0, Math.min(2, sentences.length)).join('. ') + '.'
    }
    
    console.log("✅ Final Gemini response:", truncated.substring(0, 100) + "...")
    return truncated.trim()
    
  } catch (geminiError: any) {
    console.error("❌ Gemini Error:", geminiError)
    
    const errorMessage = geminiError?.message || String(geminiError)
    
    if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
      return `I've hit the API rate limit. Please wait a moment and try again.`
    }
    
    if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
      return `There's an issue with the Gemini API key. Please check your Firebase configuration.`
    }
    
    return `I apologize, but I'm having trouble generating a response right now. Please try again. Error: ${errorMessage}`
  }
}