import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  db
} from "../firebase";

import type {
  LearningSituation,
  BaselineResult,
  MethodIntroductionResult,
  MethodLabResult,
  MethodMatchResult,
  ReflectionResult,
  LearningProfile
} from "../quiz/type";

type SaveAssessmentInput = {
  userId: string;

  learningSituation:
    LearningSituation;

  baseline:
    BaselineResult;

  methodIntroduction:
    MethodIntroductionResult;

  methodLab:
    MethodLabResult;

  methodMatch:
    MethodMatchResult;

  reflection:
    ReflectionResult;

  learningProfile:
    LearningProfile;
};

export async function saveAssessment({
  userId,
  learningSituation,
  baseline,
  methodIntroduction,
  methodLab,
  methodMatch,
  reflection,
  learningProfile
}: SaveAssessmentInput) {

  const assessmentsRef =
    collection(
      db,
      "users",
      userId,
      "assessments"
    );

  const docRef =
  await addDoc(
    assessmentsRef,
    {
      status: "completed",

      learningSituation,
      baseline,
      methodIntroduction,
      methodLab,
      methodMatch,
      reflection,
      learningProfile,

      createdAt:
        serverTimestamp()
    }
  );

  const userRef =
    doc(
      db,
      "users",
      userId
    );

  await setDoc(
    userRef,
    {
      learningProfile,

      latestAssessmentId:
        docRef.id,

      learningProfileUpdatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

return docRef.id;
}