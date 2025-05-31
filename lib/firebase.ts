// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, getDoc , collection, query, where, getDocs, addDoc } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDKKWP1baA8jgaVFZSyx2pHWMHHBLlHFvs",
  authDomain: "thedailydemocracy-37e55.firebaseapp.com",
  projectId: "thedailydemocracy-37e55",
  storageBucket: "thedailydemocracy-37e55.firebasestorage.app",
  messagingSenderId: "208931717554",
  appId: "1:208931717554:web:18e6f049b2622886d5a4ab",
  measurementId: "G-R1ZJFEYTBZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const db = getFirestore(app);
export { db };
export interface Opinion{
  id: string;
  content: string;
  publishDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export async function getTodayOpinion(): Promise<Opinion | null> {
  //const today = new Date().toISOString().split("T")[0];
  const today = "2025-05-28";
  const docRef = doc(db, "dailyOpinions", today);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists() && docSnap.data().isActive) {
    return{
      id: docSnap.id,
      ...docSnap.data()
    } as Opinion;
  } else {
    return null;
  }
}
export interface UserResponse {
  id: string;
  opinionId: string;
  stance: 'agree' | 'disagree';
  reasoning: string;
  timestamp: Date;
}

export async function submitResponse(
  opinionId: string, 
  stance: 'agree' | 'disagree', 
  reasoning: string
): Promise<boolean> {
  try {
    const responseData = {
      opinionId,
      stance,
      reasoning,
      timestamp: new Date(),
    };

    const responsesRef = collection(db, "responses");
    await addDoc(responsesRef, responseData);
    
    console.log("Response submitted successfully");
    return true;
  } catch (error) {
    console.error("Error submitting response:", error);
    return false;
  }
}
export interface OpinionStats {
  agreeCount: number;
  disagreeCount: number;
  totalResponses: number;
  agreePercentage: number;
  disagreePercentage: number;
}
export async function getOpinionStats(opinionId: string): Promise<OpinionStats> {
  console.log("Looking for responses with opinionId:", opinionId); // Debug log
  
  const responsesRef = collection(db, "responses");
  const q = query(responsesRef, where("opinionId", "==", opinionId));
  const querySnapshot = await getDocs(q);
  
  console.log("Found", querySnapshot.size, "responses"); // Debug log
  
  let agreeCount = 0;
  let disagreeCount = 0;
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log("Response:", data); // Debug log
    if (data.stance === "agree") {
      agreeCount++;
    } else if (data.stance === "disagree") {
      disagreeCount++;
    }
  });
  
  const totalResponses = agreeCount + disagreeCount;
  const agreePercentage = totalResponses > 0 ? Math.round((agreeCount / totalResponses) * 100) : 0;
  
  console.log("Final stats:", { agreeCount, disagreeCount, agreePercentage }); // Debug log
  
  return {
    agreeCount,
    disagreeCount,
    totalResponses,
    agreePercentage,
    disagreePercentage: 100 - agreePercentage
  };
}