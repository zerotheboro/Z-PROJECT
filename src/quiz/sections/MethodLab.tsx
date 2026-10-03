import {
  useEffect
} from "react";

import {
  useTrainingState as useState
} from "../trainingProgressState";

import {
  getMethodDefinition
} from "../methodRegistry";
import {
  EngineProgress
} from "../engines/shared";

import type {
  MethodExperimentResult,
  MethodLabResult,
  TrainingMethodId
} from "../type";

type Props = {
  methods: TrainingMethodId[];

  random?: () => number;

  onProgress?: (progress: {
    method: TrainingMethodId;
    methodIndex: number;
    contentSetIds: string[];
  }) => void;

  onComplete: (
    result: MethodLabResult
  ) => void;
};

function MethodLab({
  methods,
  random,
  onProgress,
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

  const [contentSetIds] = useState(
    () =>
      methods.map((method) =>
        getMethodDefinition(
          method
        ).selectLabContentSetId(
          random
        )
      )
  );

  const currentMethod =
    methods[currentExperimentIndex];

  useEffect(() => {
    onProgress?.({
      method: currentMethod,
      methodIndex: currentExperimentIndex,
      contentSetIds
    });
  }, [
    contentSetIds,
    currentExperimentIndex,
    currentMethod,
    onProgress
  ]);

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

  const experiment =
    getMethodDefinition(
      currentMethod
    ).renderLab(
      contentSetIds[
        currentExperimentIndex
      ],
      handleExperimentComplete
    );
  return (
    <section className="method-lab">

      <EngineProgress
        className="method-lab-progress"
        label="SECTION 3 OF 6"
        status={
          <>
          Experiment{" "}
          {currentExperimentIndex + 1}
          {" / "}
          {methods.length}
          </>
        }
      />

      {experiment}

    </section>
  );
}

export default MethodLab;
