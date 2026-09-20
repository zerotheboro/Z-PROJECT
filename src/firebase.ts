import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBmzLOSBtGmblLeFCFluMXvr5JiuppXb60",
  authDomain: "edulience-920ba.firebaseapp.com",
  projectId: "edulience-920ba",
  storageBucket: "edulience-920ba.firebasestorage.app",
  messagingSenderId: "185334169456",
  appId: "1:185334169456:web:ac8c7897d1ae60c00259b5",
  measurementId: "G-03QZT9QZC7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

// For AI later
export const functions = getFunctions(
  app,
  "asia-southeast1"
);

export default app;