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
import type { ObservationMetadata } from "../quiz/learningEvidence";
import type { MaterialPresentations } from "../quiz/economics9708/presentationRecords";
import type { EconomicsResponses } from "../quiz/economics9708/assessmentEvidence";

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
  metadata?: readonly ObservationMetadata[];
  materialPresentations?: MaterialPresentations;
  economicsResponses?: EconomicsResponses;
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
  learningProfile,
  metadata,
  materialPresentations,
  economicsResponses
}: SaveAssessmentInput) {

  const assessmentsRef =
    collection(
      db,
      "users",
      userId,
      "assessments"
    );

  const assessmentData = {
      ...(metadata ? { metadata } : {}),
      ...(materialPresentations ? { materialPresentations } : {}),
      ...(economicsResponses ? { economicsResponses } : {}),
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
