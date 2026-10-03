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

import type {
  MethodLabResult,
  MethodMatchExperimentResult,
  MethodMatchResult,
  TrainingMethodId
} from "../type";

type Props = {
  methodLab: MethodLabResult;

  random?: () => number;

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
  onComplete
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
      methods.map((method) =>
        getMethodDefinition(
          method
        ).selectMatchContentSetId(
          random
        )
      )
  );

  const currentMethod =
    methods[currentIndex];

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

    const updated = [
      ...results,
      result
    ];

    setResults(updated);

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
        label="SECTION 4 OF 6"
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
