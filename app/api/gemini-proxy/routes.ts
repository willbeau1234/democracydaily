import { NextRequest } from 'next/server'
import { initializeApp } from "firebase/app"
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'

const firebaseConfig = {
  apiKey: "AIzaSyDKKWP1baA8jgaVFZSyx2pHWMHHBLlHFvs",
  authDomain: "thedailydemocracy-37e55.firebaseapp.com",
  projectId: "thedailydemocracy-37e55",
  storageBucket: "thedailydemocracy-37e55.firebasestorage.app",
  messagingSenderId: "208931717554",
  appId: "1:208931717554:web:18e6f049b2622886d5a4ab",
  measurementId: "G-R1ZJFEYTBZ"
}

const firebaseApp = initializeApp(firebaseConfig, 'api-gemini')
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() })
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" })

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    return Response.json({ text })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}