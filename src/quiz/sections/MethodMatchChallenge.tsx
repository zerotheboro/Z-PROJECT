import {
  useMemo,
  useState
} from "react";

import {
  selectMethodsForVerification
} from "../methodMatchSelector";

import ActiveRecallMatch
  from "../matches/ActiveRecallMatch";

import FeynmanMatch
  from "../matches/FeynmanMatch";

import CornellMatch
  from "../matches/CornellMatch";

import InterleavingMatch
  from "../matches/InterleavingMatch";

import MemoryPalaceMatch
  from "../matches/MemoryPalaceMatch";

import type {
  MethodLabResult,
  MethodId,
  MethodMatchExperimentResult,
  MethodMatchResult
} from "../type";

type Props = {
  methodLab: MethodLabResult;

  onComplete: (
    result: MethodMatchResult
  ) => void;
};

function MethodMatchChallenge({
  methodLab,
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

  const currentMethod =
    methods[currentIndex];

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
    method: MethodId
  ) {

    return (
      methodLab.experiments.find(
        (experiment) =>
          experiment.method ===
          method
      )?.score ?? null
    );
  }

  function renderVerification() {

  const originalScore =
    getOriginalScore(
      currentMethod
    );

  switch (currentMethod) {

    case "active-recall":
      return (
        <ActiveRecallMatch
          originalScore={
            originalScore
          }
          onComplete={
            completeVerification
          }
        />
      );

    case "feynman":
      return (
        <FeynmanMatch
          originalScore={
            originalScore
          }
          onComplete={
            completeVerification
          }
        />
      );

      
    case "cornell":
    return (
        <CornellMatch
        originalScore={
            originalScore
        }
        onComplete={
            completeVerification
        }
        />
    );

    case "interleaving":
    return (
        <InterleavingMatch
        originalScore={
            originalScore
        }
        onComplete={
            completeVerification
        }
        />
    );

    case "memory-palace":
    return (
      <MemoryPalaceMatch
        originalScore={
          originalScore
        }
        onComplete={
          completeVerification
        }
      />
    );

    default:
      return (
        <div>
          Verification for{" "}
          <strong>
            {currentMethod}
          </strong>
          {" "}
          is not implemented yet.
        </div>
      );
    }
    }

  return (
    <section className="method-match">

      <div className="method-match-header">

        <span>
          SECTION 4 OF 6
        </span>

        <span>
          Match{" "}
          {currentIndex + 1}
          {" / "}
          {methods.length}
        </span>

      </div>

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

    {renderVerification()}

    </section>
  );
}

export default MethodMatchChallenge;