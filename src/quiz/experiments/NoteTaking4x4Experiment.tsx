import {
  useState
} from "react";

import type {
  LabEngineProps,
  OrganizationEngineData
} from "../methodEngineTypes";
import {
  LabRatings,
  MultipleChoiceRunner,
  scoreMultipleChoice,
  TextResponse,
  useExperimentTimer
} from "../engines/shared";

type Stage =
  | "intro"
  | "organize"
  | "details"
  | "test"
  | "reflection";

type Props = LabEngineProps<OrganizationEngineData>;

function updateEntry(
  values: string[],
  index: number,
  value: string
) {
  return values.map((entry, entryIndex) =>
    entryIndex === index
      ? value
      : entry
  );
}

function NoteTaking4x4Experiment({
  method,
  category,
  name,
  data,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("intro");
  const [subIdeas, setSubIdeas] =
    useState(["", "", "", ""]);
  const [supportingDetails, setSupportingDetails] =
    useState(["", "", "", ""]);
  const [answers, setAnswers] =
    useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] =
    useState(0);
  const [confidence, setConfidence] =
    useState<number | null>(null);
  const [ease, setEase] =
    useState<number | null>(null);
  const [willingnessToUse, setWillingnessToUse] =
    useState<number | null>(null);

  const {
    start: startTimer,
    elapsedMs
  } = useExperimentTimer();

  const currentQuestion =
    data.questions[questionIndex];

  function startExperiment() {
    startTimer();
    setStage("organize");
  }

  function nextQuestion() {
    if (
      questionIndex <
      data.questions.length - 1
    ) {
      setQuestionIndex(
        (previous) => previous + 1
      );
      return;
    }

    setStage("reflection");
  }

  function finishExperiment() {
    if (
      confidence === null ||
      ease === null ||
      willingnessToUse === null
    ) {
      return;
    }

    const {
      correct,
      total,
      score
    } = scoreMultipleChoice(
      data.questions,
      answers
    );

    console.log(
      "NOTE-TAKING 4X4:",
      {
        subIdeas,
        supportingDetails
      }
    );

    onComplete({
      method,
      category,
      correct,
      total,
      score,
      confidence,
      ease,
      willingnessToUse,
      timeSpentMs: elapsedMs()
    });
  }

  return (
    <section className="method-experiment">
      {stage === "intro" && (
        <div>
          <p>METHOD LAB · ORGANIZATION</p>
          <h2>{name}</h2>
          <p>
            You'll organize one main idea
            into four sub-ideas and add
            supporting details beneath them.
          </p>
          <ul>
            <li>One main idea</li>
            <li>Four important sub-ideas</li>
            <li>Supporting details for each</li>
          </ul>
          <button
            type="button"
            onClick={startExperiment}
          >
            Start experiment
          </button>
        </div>
      )}

      {stage === "organize" && (
        <div>
          <p>STEP 1 · ORGANIZE</p>
          <h2>{data.topic}</h2>
          <div className="cornell-layout">
            <div className="cornell-source">
              <h3>Learning material</h3>
              <p>{data.content}</p>
            </div>
            <div className="cornell-notes">
              {subIdeas.map((idea, index) => (
                <div key={index}>
                  <h3>
                    Sub-idea {index + 1}
                  </h3>
                  <TextResponse
                    value={idea}
                    onChange={(value) =>
                      setSubIdeas(
                        updateEntry(
                          subIdeas,
                          index,
                          value
                        )
                      )
                    }
                    placeholder={`Main point ${index + 1}...`}
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={subIdeas.some(
              (idea) =>
                idea.trim().length < 3
            )}
            onClick={() => setStage("details")}
          >
            Continue
          </button>
        </div>
      )}

      {stage === "details" && (
        <div>
          <p>STEP 2 · SUPPORTING DETAILS</p>
          <h2>
            Add supporting details beneath
            each of your four sub-ideas.
          </h2>
          {supportingDetails.map(
            (details, index) => (
              <div key={index}>
                <h3>{subIdeas[index]}</h3>
                <TextResponse
                  value={details}
                  onChange={(value) =>
                    setSupportingDetails(
                      updateEntry(
                        supportingDetails,
                        index,
                        value
                      )
                    )
                  }
                  placeholder={`Supporting details ${index + 1}...`}
                />
              </div>
            )
          )}
          <button
            type="button"
            disabled={supportingDetails.some(
              (details) =>
                details.trim().length < 8
            )}
            onClick={() => setStage("test")}
          >
            Continue to test
          </button>
        </div>
      )}

      {stage === "test" && (
        <div>
          <p>STEP 3 · COMPREHENSION CHECK</p>
          <p>
            Question {questionIndex + 1}
            {" / "}
            {data.questions.length}
          </p>
          <MultipleChoiceRunner
            question={currentQuestion}
            selectedAnswer={
              answers[currentQuestion.id]
            }
            onSelect={(option) =>
              setAnswers((previous) => ({
                ...previous,
                [currentQuestion.id]: option
              }))
            }
            onNext={nextQuestion}
            nextLabel={
              questionIndex ===
              data.questions.length - 1
                ? "Finish test"
                : "Next question"
            }
          />
        </div>
      )}

      {stage === "reflection" && (
        <div>
          <p>STEP 4 · REFLECT</p>
          <h2>How did {name} feel?</h2>
          <LabRatings
            confidence={{
              prompt: <>
                How confident are you
                that you understood and
                organized the material?
              </>,
              value: confidence,
              onChange: setConfidence
            }}
            ease={{
              prompt: "How easy was the method?",
              value: ease,
              onChange: setEase
            }}
            willingnessToUse={{
              prompt: <>
                Would you use {name}
                while studying?
              </>,
              value: willingnessToUse,
              onChange: setWillingnessToUse
            }}
            completeLabel="Complete experiment"
            onComplete={finishExperiment}
          />
        </div>
      )}
    </section>
  );
}

export default NoteTaking4x4Experiment;
