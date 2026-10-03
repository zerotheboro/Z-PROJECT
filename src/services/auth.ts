import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";

import { auth } from "../firebase";
import { createUserIfNeeded } from "./user";

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(
    auth,
    provider
  );

  const user = result.user;

  await createUserIfNeeded(user);

  return user;
}

export async function logoutUser() {
  await signOut(auth);
}

export const logout = logoutUser;

export function subscribeToAuth(
  callback: (user: User | null) => void
) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}
