import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";

import { auth } from "../firebase";
import { createUserIfNeeded } from "./user";
import { resetStudyFollowThroughSession, syncStudyFollowThroughOwner } from "./studyFollowThroughSession";
import { resetProgressPilot, syncProgressPilotOwner } from "./economicsProgressPilotSession";

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  if (import.meta.env.DEV) { resetStudyFollowThroughSession(); resetProgressPilot(); }
  const result = await signInWithPopup(
    auth,
    provider
  );

  const user = result.user;

  await createUserIfNeeded(user);

  return user;
}

export async function logoutUser() {
  if (import.meta.env.DEV) { resetStudyFollowThroughSession(); resetProgressPilot(); }
  await signOut(auth);
}

export const logout = logoutUser;

export function subscribeToAuth(
  callback: (user: User | null) => void
) {
  return onAuthStateChanged(auth, user => {
    if (import.meta.env.DEV) { syncStudyFollowThroughOwner(user); syncProgressPilotOwner(user); }
    callback(user);
  });
}

export function getCurrentUser() {
  return auth.currentUser;
}
