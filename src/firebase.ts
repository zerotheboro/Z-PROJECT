import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { localCompletionConfig } from "./services/localTrainingCompletionConfig";

const localCompletion = localCompletionConfig();

const firebaseConfig = {
  apiKey: "AIzaSyBmzLOSBtGmblLeFCFluMXvr5JiuppXb60",
  authDomain: "edulience-920ba.firebaseapp.com",
  projectId: "edulience-920ba",
  storageBucket: "edulience-920ba.firebasestorage.app",
  messagingSenderId: "185334169456",
  appId: "1:185334169456:web:ac8c7897d1ae60c00259b5",
  measurementId: "G-03QZT9QZC7"
};

const app = localCompletion
  ? initializeApp({ projectId: localCompletion.projectId, apiKey: "demo-local-only", authDomain: "localhost" }, "edulience-local-phase2b")
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

// For AI later
export const functions = getFunctions(
  app,
  "asia-southeast1"
);

if (localCompletion) {
  connectAuthEmulator(auth, `http://${localCompletion.authHost}:${localCompletion.authPort}`, { disableWarnings: true });
  connectFirestoreEmulator(db, localCompletion.firestoreHost, localCompletion.firestorePort);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export default app;
