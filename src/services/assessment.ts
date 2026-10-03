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

  sessionId?: string;

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
  sessionId,
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

  const assessmentData = {
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
    };

  const docRef = sessionId
    ? doc(
        db,
        "users",
        userId,
        "assessments",
        sessionId
      )
    : await addDoc(
        assessmentsRef,
        assessmentData
      );

  if (sessionId) {
    await setDoc(
      docRef,
      assessmentData,
      { merge: true }
    );
  }

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
