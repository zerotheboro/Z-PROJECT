import {
  useState
} from "react";

import {
  methodIntroductionData
} from "../methodIntroductionData";

import type {
  LearningSituation,
  BaselineResult,
  MethodId,
  MethodIntroductionResult
} from "../type";

type Props = {
  methods: MethodId[];

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
    useState<Record<string, MethodId>>({});

  const currentMethod =
    methods[methodIndex];

  const currentData =
    methodIntroductionData[
      currentMethod
    ];

  const knowledgeMethod =
    methods[questionIndex];

  const knowledgeData =
    methodIntroductionData[
      knowledgeMethod
    ];

  function getReasons(
    method: MethodId
  ): string[] {

    const reasons: string[] = [];

    if (
      method === "active-recall"
    ) {

      if (
        learningSituation
          .difficulties
          .includes("forgetting")
      ) {
        reasons.push(
          "You reported difficulty remembering information."
        );
      }

      if (
        learningSituation
          .contentTypes
          .includes("facts")
      ) {
        reasons.push(
          "You often study factual material."
        );
      }

      if (
        baseline.memory.score <
        0.7
      ) {
        reasons.push(
          "Your baseline suggests memory is worth testing further."
        );
      }
    }

    if (
      method === "memory-palace"
    ) {

      if (
        learningSituation
          .difficulties
          .includes("forgetting")
      ) {
        reasons.push(
          "You reported difficulty remembering information."
        );
      }

      if (
        learningSituation
          .contentTypes
          .includes("facts")
      ) {
        reasons.push(
          "You often need to remember factual material."
        );
      }
    }

    if (
      method === "feynman"
    ) {

      if (
        learningSituation
          .difficulties
          .includes("understanding")
      ) {
        reasons.push(
          "You reported difficulty understanding concepts."
        );
      }

      if (
        learningSituation
          .contentTypes
          .includes("concepts")
      ) {
        reasons.push(
          "Conceptual material is important in your learning."
        );
      }

      if (
        baseline
          .understanding
          .score < 0.7
      ) {
        reasons.push(
          "Your understanding baseline makes this useful to test."
        );
      }
    }

    if (
      method === "cornell"
    ) {

      if (
        learningSituation
          .contentTypes
          .includes("reading")
      ) {
        reasons.push(
          "You regularly work with reading material."
        );
      }

      if (
        learningSituation
          .contentTypes
          .includes("essays")
      ) {
        reasons.push(
          "Organizing ideas may help with essay-based material."
        );
      }

      if (
        learningSituation
          .difficulties
          .includes(
            "prioritization"
          )
      ) {
        reasons.push(
          "You reported difficulty identifying or prioritizing important information."
        );
      }
    }

    if (
      method ===
      "interleaving"
    ) {

      if (
        learningSituation
          .contentTypes
          .includes("problems")
      ) {
        reasons.push(
          "You regularly work with problem-solving material."
        );
      }

      if (
        learningSituation
          .difficulties
          .includes("application")
      ) {
        reasons.push(
          "You reported difficulty applying what you learn."
        );
      }
    }

    if (
      reasons.length === 0
    ) {
      reasons.push(
        "This method gives us another useful learning approach to compare."
      );
    }

    return reasons;
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

  function selectAnswer(
    answer: MethodId
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
                    methodIntroductionData[
                      method
                    ];

                  if (!info) {
                    return null;
                  }

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