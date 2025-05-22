// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBZI2lyVo2DqX9WyOvapwdtrAj9RkdR3s8",
  authDomain: "democracydaily-695df.firebaseapp.com",
  projectId: "democracydaily-695df",
  storageBucket: "democracydaily-695df.firebasestorage.app",
  messagingSenderId: "227805793972",
  appId: "1:227805793972:web:010ec3ba03dfb08411d1e1",
  measurementId: "G-7CYDL21MHS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
export { db };
