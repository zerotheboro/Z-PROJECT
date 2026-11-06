import {
  useEffect,
  useMemo
} from "react";

import {
  useTrainingState as useState
} from "../trainingProgressState";

import {
  selectMethodsForVerification
} from "../methodMatchSelector";

import {
  getMethodDefinition
} from "../methodRegistry";
import {
  EngineProgress
} from "../engines/shared";
import { useAssessmentCompletionSound } from "../AssessmentQuestionUX";
import { economicsAssignments } from "../economics9708/allocation";
import type { EconomicsActivityVersion } from "../economics9708/runtime";

import type {
  MethodLabResult,
  MethodMatchExperimentResult,
  MethodMatchResult,
  TrainingMethodId
} from "../type";

type Props = {
  methodLab: MethodLabResult;

  random?: () => number;
  economicsTopicId?: string;
  economicsActivityVersion?: EconomicsActivityVersion;

  onProgress?: (progress: {
    method: TrainingMethodId;
    methodIndex: number;
    methods: TrainingMethodId[];
    contentSetIds: string[];
  }) => void;

  onComplete: (
    result: MethodMatchResult
  ) => void;
};

function MethodMatchChallenge({
  methodLab,
  random,
  onProgress,
  onComplete,
  economicsTopicId,
  economicsActivityVersion
}: Props) {

  const methods = useMemo(
    () =>
      selectMethodsForVerification(
        methodLab.experiments
      ),
    [methodLab]
  );

  const [
    currentIndex,
    setCurrentIndex
  ] = useState(0);

  const [
    results,
    setResults
  ] =
    useState<
      MethodMatchExperimentResult[]
    >([]);

  const [contentSetIds] = useState(
    () =>
      economicsTopicId ? economicsAssignments(methods, "match", economicsTopicId, economicsActivityVersion) : methods.map((method) =>
        getMethodDefinition(
          method
        ).selectMatchContentSetId(
          random, economicsTopicId
        )
      )
  );

  const currentMethod =
    methods[currentIndex];
  const completeSound = useAssessmentCompletionSound();

  useEffect(() => {
    onProgress?.({
      method: currentMethod,
      methodIndex: currentIndex,
      methods,
      contentSetIds
    });
  }, [
    contentSetIds,
    currentIndex,
    currentMethod,
    methods,
    onProgress
  ]);

  function completeVerification(
    result:
      MethodMatchExperimentResult
  ) {

    if (result.method !== currentMethod || results.some(item => item.method === result.method)) return;

    const updated = [
      ...results,
      result
    ];

    setResults(updated);
    completeSound(`match:${currentMethod}:${contentSetIds[currentIndex]}`);

    if (
      currentIndex <
      methods.length - 1
    ) {

      setCurrentIndex(
        (prev) => prev + 1
      );

      return;
    }

    onComplete({
      methods: updated
    });
  }

  function getOriginalScore(
    method: TrainingMethodId
  ) {

    return (
      methodLab.experiments.find(
        (experiment) =>
          experiment.method ===
          method
      )?.score ?? null
    );
  }

  const originalScore =
    getOriginalScore(
      currentMethod
    );

  const verification =
    getMethodDefinition(
      currentMethod
    ).renderMatch(
      contentSetIds[currentIndex],
      originalScore,
      completeVerification
    );

  return (
    <section className="method-match">

      <EngineProgress
        className="method-match-header"
        label="SECTION 5 — VERIFICATION"
        status={
          <>
          Match{" "}
          {currentIndex + 1}
          {" / "}
          {methods.length}
          </>
        }
      />

      <h2>
        Method Match Challenge
      </h2>

      <p>
        We're testing your strongest
        methods again using completely
        new material.
      </p>

      <p>
        Current method:
        {" "}
        <strong>
          {currentMethod}
        </strong>
      </p>

      <p>
      Original score:{" "}
      {
        getOriginalScore(
          currentMethod
        )
      }
    </p>

    {verification}

    </section>
  );
}

export default MethodMatchChallenge;
