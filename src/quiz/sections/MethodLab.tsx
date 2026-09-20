import ActiveRecallExperiment
  from "../experiments/ActiveRecallExperiment";

import FeynmanExperiment
  from "../experiments/FeynmanExperiment";

import CornellExperiment
  from "../experiments/CornellExperiment";

import InterleavingExperiment
  from "../experiments/InterleavingExperiment";

import MemoryPalaceExperiment
  from "../experiments/MemoryPalaceExperiment";

import {
  useMemo,
  useState
} from "react";

import type {
  LearningSituation,
  BaselineResult,
  MethodExperimentResult,
  MethodLabResult,
  MethodId
} from "../type";

type Props = {
  methods: MethodId[];

  onComplete: (
    result: MethodLabResult
  ) => void;
};

function MethodLab({
  methods,
  onComplete
}: Props) {

console.log(
  "SELECTED METHODS:",
  methods
);

  const [
    currentExperimentIndex,
    setCurrentExperimentIndex
  ] = useState(0);

  const [
    results,
    setResults
  ] = useState<
    MethodExperimentResult[]
  >([]);

  const currentMethod =
    methods[currentExperimentIndex];

  function handleExperimentComplete(
    result: MethodExperimentResult
  ) {

    const updatedResults = [
      ...results,
      result
    ];

    setResults(updatedResults);

    console.log(
      "EXPERIMENT RESULT:",
      result
    );

    /*
      Are there more experiments?
    */

    if (
      currentExperimentIndex <
      methods.length - 1
    ) {

      setCurrentExperimentIndex(
        (prev) => prev + 1
      );

      return;
    }

    /*
      No more experiments:
      Method Lab is finished.
    */

    console.log(
      "METHOD LAB COMPLETE:",
      updatedResults
    );

    onComplete({
      experiments:
        updatedResults
    });
  }

 function renderExperiment() {

  switch (currentMethod) {

    case "active-recall":
      return (
        <ActiveRecallExperiment
          onComplete={
            handleExperimentComplete
          }
        />
      );

    case "feynman":
      return (
        <FeynmanExperiment
          onComplete={
            handleExperimentComplete
          }
        />
      );
      
    case "cornell":
      return (
        <CornellExperiment
          onComplete={
            handleExperimentComplete
          }
        />
      );

    case "interleaving":
      return (
        <InterleavingExperiment
          onComplete={
            handleExperimentComplete
          }
        />
      );
    
    case "memory-palace":
      return (
        <MemoryPalaceExperiment
          onComplete={
            handleExperimentComplete
          }
        />
      );
     

    default:
      return (
        <p>
          Experiment not implemented yet.
        </p>
      );
    }
  }
  return (
    <section className="method-lab">

      <div className="method-lab-progress">

        <span>
          SECTION 3 OF 6
        </span>

        <span>
          Experiment{" "}
          {currentExperimentIndex + 1}
          {" / "}
          {methods.length}
        </span>

      </div>

      {renderExperiment()}

    </section>
  );
}

export default MethodLab;