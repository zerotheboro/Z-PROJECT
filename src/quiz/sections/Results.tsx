import type {
  LearningProfile,
  MethodEvidence,
  MethodId
} from "../type";

type Props = {
  profile: LearningProfile;
};

function getMethodName(
  method: MethodId
) {
  switch (method) {
    case "active-recall":
      return "Active Recall";

    case "feynman":
      return "Feynman Technique";

    case "cornell":
      return "Cornell Notes";

    case "interleaving":
      return "Interleaving";

    case "memory-palace":
      return "Memory Palace";

    case "pomodoro":
      return "Pomodoro";

    case "stopwatch":
      return "Stopwatch";

    default:
      return method;
  }
}

function percent(
  score: number | null
) {
  if (score === null) {
    return "Not tested";
  }

  return `${Math.round(score * 100)}%`;
}

function Results({
  profile
}: Props) {

  const strongestEvidence =
    profile.methodEvidence.find(
      (method) =>
        method.method ===
        profile.strongestVerifiedMethod
    );

  const preferredEvidence =
    profile.preferredMethod
      ? profile.methodEvidence.find(
          (method) =>
            method.method ===
            profile.preferredMethod
        )
      : null;

  function renderMethodEvidence(
    evidence: MethodEvidence
  ) {
    return (
      <div
        key={evidence.method}
        className="profile-method-card"
      >

        <h3>
          {
            getMethodName(
              evidence.method
            )
          }
        </h3>

        <div className="profile-stat">

          <span>
            Method Lab
          </span>

          <strong>
            {
              percent(
                evidence.labScore
              )
            }
          </strong>

        </div>

        <div className="profile-stat">

          <span>
            Verification
          </span>

          <strong>
            {
              percent(
                evidence
                  .verificationScore
              )
            }
          </strong>

        </div>

        <div className="profile-stat">

          <span>
            Confidence
          </span>

          <strong>
            {
              evidence
                .labConfidence
            }
            /5
          </strong>

        </div>

        <div className="profile-stat">

          <span>
            Ease
          </span>

          <strong>
            {evidence.ease}/5
          </strong>

        </div>

        <div className="profile-stat">

          <span>
            Would use again
          </span>

          <strong>
            {
              evidence
                .willingnessToUse
            }
            /5
          </strong>

        </div>

      </div>
    );
  }

  return (
    <section className="learning-profile">

      {/* ===================== */}
      {/* HEADER */}
      {/* ===================== */}

      <div className="profile-header">

        <p>
          ASSESSMENT COMPLETE
        </p>

        <h1>
          Your Learning Profile
        </h1>

        <p>
          Your profile combines your
          baseline performance,
          method experiments,
          verification challenges,
          and your own experience.
        </p>

      </div>


      {/* ===================== */}
      {/* STRONGEST VERIFIED */}
      {/* ===================== */}

      <div className="profile-highlight">

        <p>
          STRONGEST VERIFIED RESULT
        </p>

        {profile
          .strongestVerifiedMethod ? (

          <>

            <h2>
              {
                getMethodName(
                  profile
                    .strongestVerifiedMethod
                )
              }
            </h2>

            <p>
              This method produced the
              strongest combined evidence
              across your Method Lab and
              verification challenge.
            </p>

            {strongestEvidence && (

              <div className="profile-score-row">

                <span>
                  First attempt
                </span>

                <strong>
                  {
                    percent(
                      strongestEvidence
                        .labScore
                    )
                  }
                </strong>

                <span>
                  Verification
                </span>

                <strong>
                  {
                    percent(
                      strongestEvidence
                        .verificationScore
                    )
                  }
                </strong>

              </div>

            )}

          </>

        ) : (

          <p>
            No verified method result
            was available.
          </p>

        )}

      </div>


      {/* ===================== */}
      {/* PERSONAL PREFERENCE */}
      {/* ===================== */}

      <div className="profile-section">

        <p>
          YOUR PREFERENCE
        </p>

        <h2>
          {
            profile.preferredMethod
              ? getMethodName(
                  profile
                    .preferredMethod
                )
              : "No clear preference"
          }
        </h2>

        {profile.preferredMethod ? (

          <p>
            This is the method you said
            you would personally be most
            likely to use again.
          </p>

        ) : (

          <p>
            You didn't strongly prefer
            either of the final methods.
          </p>

        )}

        {preferredEvidence && (

          <p>
            Your willingness-to-use
            rating for this method was{" "}
            <strong>
              {
                preferredEvidence
                  .willingnessToUse
              }
              /5
            </strong>.
          </p>

        )}

      </div>


      {/* ===================== */}
      {/* BASELINE */}
      {/* ===================== */}

      <div className="profile-section">

        <p>
          YOUR BASELINE
        </p>

        <h2>
          Starting performance
        </h2>

        <div className="profile-baseline-grid">

          <div>

            <span>
              Memory
            </span>

            <strong>
              {
                percent(
                  profile
                    .baseline
                    .memoryScore
                )
              }
            </strong>

          </div>

          <div>

            <span>
              Understanding
            </span>

            <strong>
              {
                percent(
                  profile
                    .baseline
                    .understandingScore
                )
              }
            </strong>

          </div>

        </div>

      </div>


      {/* ===================== */}
      {/* RECOMMENDED METHODS */}
      {/* ===================== */}

      <div className="profile-section">

        <p>
          RECOMMENDED STARTING METHODS
        </p>

        <h2>
          Methods worth continuing
        </h2>

        <p>
          These methods showed the
          strongest evidence during this
          assessment.
        </p>

        <div className="recommended-methods">

          {
            profile
              .recommendedMethods
              .map(
                (
                  method,
                  index
                ) => (

                  <div
                    key={method}
                    className="recommended-method"
                  >

                    <span>
                      {index + 1}
                    </span>

                    <strong>
                      {
                        getMethodName(
                          method
                        )
                      }
                    </strong>

                  </div>

                )
              )
          }

        </div>

      </div>


      {/* ===================== */}
      {/* ALL METHOD EVIDENCE */}
      {/* ===================== */}

      <div className="profile-section">

        <p>
          METHOD RESULTS
        </p>

        <h2>
          What happened in the lab
        </h2>

        <div className="profile-method-grid">

          {
            profile
              .methodEvidence
              .map(
                renderMethodEvidence
              )
          }

        </div>

      </div>


      {/* ===================== */}
      {/* METHOD KNOWLEDGE */}
      {/* ===================== */}

      <div className="profile-section">

        <p>
          METHOD UNDERSTANDING
        </p>

        <h2>
          {
            percent(
              profile
                .methodKnowledgeScore
            )
          }
        </h2>

        <p>
          This reflects your short
          understanding check before
          entering the Method Lab.
        </p>

      </div>


      {/* ===================== */}
      {/* USER PRIORITY */}
      {/* ===================== */}

      <div className="profile-section">

        <p>
          WHAT MATTERS TO YOU
        </p>

        <h2>
          {
            profile.priority ===
            "performance"
              ? "Performance"

            : profile.priority ===
              "ease"
              ? "Ease of use"

            : profile.priority ===
              "confidence"
              ? "Confidence"

            : "Realistic everyday use"
          }
        </h2>

      </div>


      {/* ===================== */}
      {/* FINAL NOTE */}
      {/* ===================== */}

      <div className="profile-note">

        <h2>
          This profile is a starting
          point.
        </h2>

        <p>
          Learning methods can work
          differently depending on the
          subject, difficulty, available
          time, and how consistently you
          use them.
        </p>

        <p>
          Edulience can refine this
          profile as you complete more
          learning sessions.
        </p>

      </div>

    </section>
  );
}

export default Results;