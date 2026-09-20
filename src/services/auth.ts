import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut
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

export async function logout() {
  await signOut(auth);
}