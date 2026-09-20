import type {
  BaselineResult,
  MethodIntroductionResult,
  MethodLabResult,
  MethodMatchResult,
  ReflectionResult,
  LearningProfile,
  MethodEvidence
} from "./type";

type BuildProfileInput = {
  baseline: BaselineResult;

  methodIntroduction:
    MethodIntroductionResult;

  methodLab:
    MethodLabResult;

  methodMatch:
    MethodMatchResult;

  reflection:
    ReflectionResult;
};

export function buildLearningProfile({
  baseline,
  methodIntroduction,
  methodLab,
  methodMatch,
  reflection
}: BuildProfileInput): LearningProfile {

  const methodEvidence:
    MethodEvidence[] =
    methodLab.experiments.map(
      (experiment) => {

        const verification =
          methodMatch.methods.find(
            (result) =>
              result.method ===
              experiment.method
          );

        const labScore =
          experiment.score;

        const verificationScore =
          verification
            ?.verificationScore ??
          null;

        const labConfidence =
          experiment.confidence;

        const verificationConfidence =
          verification
            ?.confidence ??
          null;

        /*
          Convert 1–5 ratings
          into 0–1 values.
        */

        const confidenceNormalized =
          labConfidence / 5;

        const easeNormalized =
          experiment.ease / 5;

        const willingnessNormalized =
          experiment
            .willingnessToUse / 5;

        /*
          VERIFIED METHOD

          Performance matters most.

          Section 4 verification gets
          strong weight because it tests
          whether the method worked again
          on new material.
        */

        let evidenceScore: number;

        if (
          verificationScore !== null &&
          verificationConfidence !== null
        ) {

          const verificationConfidenceNormalized =
            verificationConfidence / 5;

          evidenceScore =
            (labScore ?? 0) * 0.40 +
            verificationScore * 0.35 +
            confidenceNormalized * 0.05 +
            verificationConfidenceNormalized * 0.05 +
            easeNormalized * 0.05 +
            willingnessNormalized * 0.10;

        } else {

          /*
            UNVERIFIED METHOD

            We still have useful Section 4
            evidence, but less certainty.
          */

          evidenceScore =
            (labScore ?? 0) * 0.65 +
            confidenceNormalized * 0.10 +
            easeNormalized * 0.10 +
            willingnessNormalized * 0.15;
        }

        return {
          method:
            experiment.method,

          labScore,

          verificationScore,

          labConfidence,

          verificationConfidence,

          ease:
            experiment.ease,

          willingnessToUse:
            experiment
              .willingnessToUse,

          evidenceScore
        };
      }
    );

  /*
    Strongest VERIFIED method only.

    We don't call an unverified method
    the strongest verified method.
  */

  const verifiedMethods =
    methodEvidence
      .filter(
        (method) =>
          method.verificationScore !==
          null
      )
      .sort(
        (a, b) =>
          b.evidenceScore -
          a.evidenceScore
      );

  const strongestVerifiedMethod =
    verifiedMethods[0]?.method ??
    null;

  /*
    For now:
    recommend the verified methods
    in evidence order.

    We will improve this logic next.
  */

  const recommendedMethods =
    verifiedMethods.map(
      (method) => method.method
    );

  return {
    strongestVerifiedMethod,

    preferredMethod:
      reflection.preferredMethod,

    recommendedMethods,

    methodEvidence,

    baseline: {
      memoryScore:
        baseline.memory.score,

      understandingScore:
        baseline
          .understanding
          .score
    },

    methodKnowledgeScore:
      methodIntroduction.score,

    priority:
      reflection.priority
  };
}