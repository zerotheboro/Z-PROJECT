import {
  useEffect,
  useState
} from "react";

import {
  onAuthStateChanged
} from "firebase/auth";

import type {
  User
} from "firebase/auth";

import {
  auth
} from "../firebase";

import {
  getLearningProfile
} from "../services/user";

import type {
  LearningProfile
} from "../quiz/type";


export function useUserProfile() {

  const [
    user,
    setUser
  ] =
    useState<User | null>(null);

  const [
    learningProfile,
    setLearningProfile
  ] =
    useState<LearningProfile | null>(
      null
    );

  const [
    loading,
    setLoading
  ] =
    useState(true);


  useEffect(() => {

    let active = true;
    let generation = 0;
    let currentUid: string | null = null;

    const unsubscribe =
      onAuthStateChanged(
        auth,

        async (firebaseUser) => {

          if (!active) return;
          const request = ++generation;
          currentUid = firebaseUser?.uid ?? null;

          setUser(
            firebaseUser
          );

          // Unmount the previous owner's results/disclosures before reading.
          setLearningProfile(null);
          setLoading(Boolean(firebaseUser));

          if (!firebaseUser) {
            return;
          }

          const uid = firebaseUser.uid;
          const isCurrent = () => active && request === generation &&
            currentUid === uid && auth.currentUser?.uid === uid;

          try {

            const profile =
              await getLearningProfile(
                uid
              );

            if (!isCurrent()) return;
            setLearningProfile(
              profile
            );

          } catch {

            if (!isCurrent()) return;

            console.error(
              "FAILED TO LOAD LEARNING PROFILE"
            );

            setLearningProfile(
              null
            );

          } finally {

            if (isCurrent()) setLoading(false);

          }
        }
      );

    return () => {
      active = false;
      generation++;
      currentUid = null;
      unsubscribe();
    };

  }, []);


  return {
    user,
    learningProfile,
    loading
  };
}
