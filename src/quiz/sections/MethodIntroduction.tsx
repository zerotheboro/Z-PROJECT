import {
  useState
} from "react";

import {
  getMethodDefinition,
  getMethodSelectionReasons
} from "../methodRegistry";

import type {
  LearningSituation,
  BaselineResult,
  MethodIntroductionResult,
  TrainingMethodId
} from "../type";

type Props = {
  methods: TrainingMethodId[];

  learningSituation:
    LearningSituation;

  baseline:
    BaselineResult;

  onComplete: (
    result:
      MethodIntroductionResult
  ) => void;
};

type Stage =
  | "methods"
  | "knowledge";

function MethodIntroduction({
  methods,
  learningSituation,
  baseline,
  onComplete
}: Props) {

  const [stage, setStage] =
    useState<Stage>("methods");

  const [
    methodIndex,
    setMethodIndex
  ] = useState(0);

  const [
    questionIndex,
    setQuestionIndex
  ] = useState(0);

  const [
    answers,
    setAnswers
  ] =
    useState<Record<string, TrainingMethodId>>({});

  const currentMethod =
    methods[methodIndex];

  const currentData =
    getMethodDefinition(
      currentMethod
    ).introduction;

  const knowledgeMethod =
    methods[questionIndex];

  const knowledgeData =
    getMethodDefinition(
      knowledgeMethod
    ).introduction;

  function getReasons(
    method: TrainingMethodId
  ): string[] {
    return getMethodSelectionReasons(
      method,
      learningSituation,
      baseline
    );
  }

  function nextMethod() {

    if (
      methodIndex <
      methods.length - 1
    ) {
      setMethodIndex(
        prev => prev + 1
      );

      return;
    }

    setStage("knowledge");
  }

  function lastMethod(){
    if(
      methodIndex - 1 >= 0
    ) {
      setMethodIndex(
        prev => prev - 1
      );

      return;
    }
  }

  function selectAnswer(
    answer: TrainingMethodId
  ) {

    setAnswers(prev => ({
      ...prev,
      [knowledgeMethod]:
        answer
    }));
  }

  function nextQuestion() {

    if (
      questionIndex <
      methods.length - 1
    ) {

      setQuestionIndex(
        prev => prev + 1
      );

      return;
    }

    finish();
  }

  function finish() {

    let correct = 0;

    methods.forEach(
      method => {

        if (
          answers[method] ===
          method
        ) {
          correct += 1;
        }

      }
    );

    const total =
      methods.length;

    onComplete({
      methods,

      correct,

      total,

      score:
        total === 0
          ? 0
          : correct / total
    });
  }

  if (
    !currentData ||
    !knowledgeData
  ) {
    return null;
  }

  return (
    <section className="method-introduction">

      {stage === "methods" && (
        <div>

          <p>
            SECTION 3 OF 6
          </p>

          <p>
            METHOD{" "}
            {methodIndex + 1}
            {" / "}
            {methods.length}
          </p>

          <h1>
            {currentData.name}
          </h1>

          <p>
            {
              currentData
                .description
            }
          </p>

          <h2>
            Why are we testing this?
          </h2>

          <ul>

            {
              getReasons(
                currentMethod
              ).map(
                reason => (

                  <li key={reason}>
                    {reason}
                  </li>

                )
              )
            }

          </ul>

          <h2>
            How it works
          </h2>

          <ol>

            {
              currentData
                .howTo
                .map(
                  step => (

                    <li key={step}>
                      {step}
                    </li>

                  )
                )
            }

          </ol>

          <h3>
            Example
          </h3>

          <p>
            {
              currentData
                .example
            }
          </p>

           <button
            type="button"
            onClick={
              lastMethod
            }
          >
            Last method
          </button>

          <button
            type="button"
            onClick={
              nextMethod
            }
          >
            {
              methodIndex ===
              methods.length - 1
                ? "Check my understanding"
                : "Next method"
            }
          </button>
        </div>
      )}

      {stage === "knowledge" && (
        <div>

          <p>
            QUICK UNDERSTANDING CHECK
          </p>

          <p>
            Question{" "}
            {questionIndex + 1}
            {" / "}
            {methods.length}
          </p>

          <h2>
            {
              knowledgeData
                .knowledgePrompt
            }
          </h2>

          <div className="option-grid">

            {
              methods.map(
                method => {

                  const info =
                    getMethodDefinition(
                      method
                    ).introduction;

                  const selected =
                    answers[
                      knowledgeMethod
                    ] === method;

                  return (
                    <button
                      type="button"
                      key={method}
                      className={
                        selected
                          ? "assessment-option selected"
                          : "assessment-option"
                      }
                      onClick={() =>
                        selectAnswer(
                          method
                        )
                      }
                    >
                      {info.name}
                    </button>
                  );
                }
              )
            }

          </div>

          <button
            type="button"
            disabled={
              !answers[
                knowledgeMethod
              ]
            }
            onClick={
              nextQuestion
            }
          >
            {
              questionIndex ===
              methods.length - 1
                ? "Start Method Lab"
                : "Next question"
            }
          </button>

        </div>
      )}

    </section>
  );
}

export default MethodIntroduction;
