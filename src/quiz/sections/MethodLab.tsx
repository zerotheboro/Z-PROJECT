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
import { useAssessmentCompletionSound } from "../AssessmentQuestionUX";
import { economicsAssignments } from "../economics9708/allocation";
import type { EconomicsActivityVersion } from "../economics9708/runtime";

import type {
  MethodExperimentResult,
  MethodLabResult,
  TrainingMethodId
} from "../type";

type Props = {
  methods: TrainingMethodId[];

  random?: () => number;
  economicsTopicId?: string;
  economicsActivityVersion?: EconomicsActivityVersion;

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
  onComplete,
  economicsTopicId,
  economicsActivityVersion
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
      economicsTopicId ? economicsAssignments(methods, "lab", economicsTopicId, economicsActivityVersion) : methods.map((method) =>
        getMethodDefinition(
          method
        ).selectLabContentSetId(
          random, economicsTopicId
        )
      )
  );

  const currentMethod =
    methods[currentExperimentIndex];
  const completeSound = useAssessmentCompletionSound();

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

    if (result.method !== currentMethod || results.some(item => item.method === result.method)) return;

    const updatedResults = [
      ...results,
      result
    ];

    setResults(updatedResults);
    completeSound(`lab:${currentMethod}:${contentSetIds[currentExperimentIndex]}`);

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
        label="SECTION 4 — METHOD LAB"
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
