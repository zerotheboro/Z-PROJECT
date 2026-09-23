import {
  useState
} from "react";

import type {
  MatchEngineProps,
  OrganizationEngineData
} from "../methodEngineTypes";
import {
  MultipleChoiceRunner,
  scoreMultipleChoice,
  StudyPanel,
  TextResponse,
  useExperimentTimer,
  VerificationConfidence
} from "../engines/shared";

type Stage =
  | "organize"
  | "details"
  | "test"
  | "confidence";

type Props = MatchEngineProps<OrganizationEngineData>;

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

function NoteTaking4x4Match({
  method,
  name,
  data,
  originalScore,
  onComplete
}: Props) {
  const [stage, setStage] =
    useState<Stage>("organize");
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

  const { elapsedMs } =
    useExperimentTimer({
      startImmediately: true
    });

  const currentQuestion =
    data.questions[questionIndex];

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

    setStage("confidence");
  }

  function finish() {
    if (confidence === null) {
      return;
    }

    const {
      score: verificationScore
    } = scoreMultipleChoice(
      data.questions,
      answers
    );

    console.log(
      "NOTE-TAKING 4X4 ROUND 2:",
      {
        subIdeas,
        supportingDetails
      }
    );

    onComplete({
      method,
      firstScore: originalScore,
      verificationScore,
      confidence,
      timeSpentMs: elapsedMs()
    });
  }

  return (
    <section className="method-match-experiment">
      {stage === "organize" && (
        <div>
          <p>{data.title.toUpperCase()}</p>
          <h2>{data.topic}</h2>
          <StudyPanel>
            <p>{data.content}</p>
          </StudyPanel>
          <div className="cornell-layout">
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
          <p>VERIFICATION TEST</p>
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

      {stage === "confidence" && (
        <div>
          <VerificationConfidence
            prompt={<>
              How confident are you
              that {name} helped you
              organize and understand
              the material?
            </>}
            value={confidence}
            onChange={setConfidence}
            completeLabel="Complete verification"
            onComplete={finish}
          />
        </div>
      )}
    </section>
  );
}

export default NoteTaking4x4Match;
