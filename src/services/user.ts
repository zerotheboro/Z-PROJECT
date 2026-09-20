import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import type {
  User
} from "firebase/auth";

import { db } from "../firebase";

import type {
  LearningProfile
} from "../quiz/type";

export async function createUserIfNeeded(
  user: User
) {
  const userRef =
    doc(
      db,
      "users",
      user.uid
    );

  const snapshot =
    await getDoc(userRef);

  if (!snapshot.exists()) {

    await setDoc(
      userRef,
      {
        uid: user.uid,

        name:
          user.displayName ?? "",

        email:
          user.email ?? "",

        photoURL:
          user.photoURL ?? "",

        createdAt:
          serverTimestamp(),

        learningProfile: null
      }
    );
  }
}

export async function getLearningProfile(
  userId: string
): Promise<LearningProfile | null> {

  const userRef =
    doc(
      db,
      "users",
      userId
    );

  const snapshot =
    await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data =
    snapshot.data();

  const profile =
  data.learningProfile;

  if (!profile) {
    return null;
  }

  // Old Edulience profile format
  if (
    !("methodEvidence" in profile) ||
    !("baseline" in profile)
  ) {
    return null;
  }

  return profile as LearningProfile;
}