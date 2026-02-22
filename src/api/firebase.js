import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAeih_13dFNF8vBc95wUzsa7k4dEhD0xuE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cdlprofit-b6b99.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://cdlprofit-b6b99-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cdlprofit-b6b99",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cdlprofit-b6b99.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "117101105301",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:117101105301:web:0305979c7d74c0be494b9c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5RJDJLLKX2",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
