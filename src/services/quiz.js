import {
  doc,
  collection,
  addDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../firebase";

export async function saveQuizResult({
  answers,
  recommendedMethods,
  learningProfile
}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User must be logged in.");
  }

  // Save quiz history
  const quizCollection = collection(
    db,
    "users",
    user.uid,
    "quizAttempts"
  );

  await addDoc(quizCollection, {
    answers,
    recommendedMethods,
    learningProfile,
    completedAt: serverTimestamp()
  });

  // Update the user's CURRENT learning profile
  const userRef = doc(
    db,
    "users",
    user.uid
  );

  await setDoc(
    userRef,
    {
      learningProfile: {
        ...learningProfile,
        recommendedMethods,
        updatedAt: serverTimestamp()
      }
    },
    {
      merge: true
    }
  );
}