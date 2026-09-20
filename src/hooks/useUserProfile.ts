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

    const unsubscribe =
      onAuthStateChanged(
        auth,

        async (firebaseUser) => {

          setUser(
            firebaseUser
          );

          if (!firebaseUser) {

            setLearningProfile(
              null
            );

            setLoading(false);

            return;
          }

          try {

            const profile =
              await getLearningProfile(
                firebaseUser.uid
              );

            setLearningProfile(
              profile
            );

          } catch (error) {

            console.error(
              "FAILED TO LOAD LEARNING PROFILE:",
              error
            );

            setLearningProfile(
              null
            );

          } finally {

            setLoading(false);

          }
        }
      );

    return unsubscribe;

  }, []);


  return {
    user,
    learningProfile,
    loading
  };
}