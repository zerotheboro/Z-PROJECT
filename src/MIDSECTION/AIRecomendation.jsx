import { useEffect, useRef, useState } from "react";
import { auth } from "../firebase";
import { subscribeToAuth } from "../services/auth";
import {
  loadAIRecommendationAccess,
  validateAIRecommendationAccess
} from "../services/aiRecommendationAccess";
import {
  loadAIRecommendation,
  saveAIRecommendation,
  validateRecommendationResult
} from "../services/aiRecommendationPersistence";
import './AISTYLE.scss';



export default function AIRecommendation() {
  const [step, setStep] = useState(0);

  const [biggestProblem, setBiggestProblem] = useState("");
  const [methodQuestion, setMethodQuestion] = useState("");
  const [extraContext, setExtraContext] = useState("");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quotaAccess, setQuotaAccess] = useState(null);

  const ownerRef = useRef(null);
  const userRef = useRef(null);
  const identityVersionRef = useRef(0);
  const restoreVersionRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = subscribeToAuth((user) => {
      const owner = user
        ? { kind: "user", uid: user.uid }
        : { kind: "guest" };
      const identityVersion =
        identityVersionRef.current + 1;
      const restoreVersion =
        restoreVersionRef.current + 1;

      identityVersionRef.current = identityVersion;
      restoreVersionRef.current = restoreVersion;
      ownerRef.current = owner;
      userRef.current = user;

      setBiggestProblem("");
      setMethodQuestion("");
      setExtraContext("");
      setResult(null);
      setError("");
      setLoading(false);
      setQuotaAccess(null);
      setStep(0);

      void loadAIRecommendationAccess(user)
        .then((access) => {
          if (
            mounted
            && identityVersionRef.current
              === identityVersion
          ) {
            setQuotaAccess(access);
          }
        })
        .catch((accessError) => {
          if (
            mounted
            && identityVersionRef.current
              === identityVersion
            && import.meta.env.DEV
          ) {
            console.error(
              "Could not load AI recommendation access.",
              accessError
            );
          }
        });

      void loadAIRecommendation(owner)
        .then((saved) => {
          if (
            !mounted
            || identityVersionRef.current
              !== identityVersion
            || restoreVersionRef.current
              !== restoreVersion
            || !saved
          ) {
            return;
          }

          setBiggestProblem(
            saved.inputs.biggestProblem
          );
          setMethodQuestion(
            saved.inputs.methodQuestion
          );
          setExtraContext(
            saved.inputs.extraContext
          );
          setResult(saved.result);
          setStep(4);
        })
        .catch((loadError) => {
          if (
            mounted
            && identityVersionRef.current
              === identityVersion
            && import.meta.env.DEV
          ) {
            console.error(
              "Could not restore the saved AI recommendation.",
              loadError
            );
          }
        });
    });

    return () => {
      mounted = false;
      identityVersionRef.current += 1;
      restoreVersionRef.current += 1;
      ownerRef.current = null;
      userRef.current = null;
      unsubscribe();
    };
  }, []);

  function markInteraction() {
    restoreVersionRef.current += 1;
  }

  async function handleAskAI() {
    const owner = ownerRef.current;

    if (!owner) {
      setError("Could not get an AI recommendation.");
      return;
    }

    const requestIdentityVersion =
      identityVersionRef.current;
    const inputs = {
      biggestProblem,
      methodQuestion,
      extraContext
    };
    try {
      setLoading(true);
      setError("");

      const authenticatedUser =
        owner.kind === "user"
        && auth.currentUser?.uid === owner.uid
          ? auth.currentUser
          : null;
      const idToken = authenticatedUser
        ? await authenticatedUser.getIdToken()
        : null;

      const response = await fetch(
        "https://z-project-ba3t.onrender.com/api/recommend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken
              ? { Authorization: `Bearer ${idToken}` }
              : {}),
          },
          body: JSON.stringify({
            biggestProblem,
            methodQuestion,
            extraContext,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const rejectedAccess =
          data?.code === "ai_daily_quota_exceeded"
            ? validateAIRecommendationAccess(data)
            : null;

        if (rejectedAccess) {
          setQuotaAccess(rejectedAccess);
        }

        throw new Error("Failed to get recommendation");
      }

      const validatedResult =
        validateRecommendationResult(data);

      if (!validatedResult) {
        throw new Error(
          "The recommendation response was malformed."
        );
      }

      if (
        identityVersionRef.current
          !== requestIdentityVersion
      ) {
        return;
      }

      setResult(validatedResult);
      setStep(4);

      void loadAIRecommendationAccess(userRef.current)
        .then((access) => {
          if (
            identityVersionRef.current
              === requestIdentityVersion
          ) {
            setQuotaAccess(access);
          }
        })
        .catch((accessError) => {
          if (import.meta.env.DEV) {
            console.error(
              "Could not refresh AI recommendation access.",
              accessError
            );
          }
        });

      try {
        await saveAIRecommendation(
          owner,
          inputs,
          validatedResult
        );
      } catch (saveError) {
        if (import.meta.env.DEV) {
          console.error(
            "Could not save the AI recommendation.",
            saveError
          );
        }
      }
    } catch (err) {
      console.error(err);
      setError("Could not get an AI recommendation.");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    markInteraction();
    setBiggestProblem("");
    setMethodQuestion("");
    setExtraContext("");
    setResult(null);
    setError("");
    setStep(0);
  }

  return (
    <section className="ai-adviser" id="AI-recommendation">
      <div className="ai-container" id="aiinner">
        <h1>Edulience's deep suggestion</h1>

        {!result && (
          <div className="progress">
            <span className={step >= 1 ? "active" : ""}></span>
            <span className={step >= 2 ? "active" : ""}></span>
            <span className={step >= 3 ? "active" : ""}></span>
          </div>
        )}

        <div className="ai-card">

          {step === 0 && (
            <div className="question">
              <span className="question-number">
                  Introduction
              </span>

              <h2>
                Start from how you learn
              </h2>
              <p>
                Receive 3 "SSS" or Suitable Study Strategies and a study plan only after 1-2 minutes submiting your answers, just to let you know by signing up you get smarter response
              </p>

              <div className="button-area">
                <button
                  className="primary-button"
                  onClick={() => {
                    markInteraction();
                    setStep(1);
                  }}
                >
                  Start →
                </button>
              </div>
            </div>
          )}


          {/* QUESTION 1 */}

          {step === 1 && (
            <div className="question">
              <span className="question-number">
                Question 1 of 3
              </span>

              <h2>
                What is your biggest study problem?
              </h2>

              <textarea
                value={biggestProblem}
                onChange={(e) => {
                  markInteraction();
                  setBiggestProblem(e.target.value);
                }}
                placeholder="I get distracted easily and forget what I study..."
              />

              <div className="button-area">
                <button
                  className="secondary-button"
                  onClick={() => {
                    markInteraction();
                    setStep(0);
                  }}
                >
                  ← Back
                </button>

                <button
                  className="primary-button"
                  disabled={!biggestProblem.trim() || biggestProblem.length < 16 || biggestProblem.length > 300}
                  onClick={() => {
                    markInteraction();
                    setStep(2);
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}


          {/* QUESTION 2 */}

          {step === 2 && (
            <div className="question">
              <span className="question-number">
                Question 2 of 3
              </span>

              <h2>
                What do you need from Edulience's SSS or study hack?
              </h2>

              <textarea
                minLength="10" 
                maxlength="300" 
                value={methodQuestion}
                onChange={(e) => {
                  markInteraction();
                  setMethodQuestion(e.target.value);
                }}
                placeholder="Which study methods would work best for me?"
              />

              <div className="button-area">
                <button
                  className="secondary-button"
                  onClick={() => {
                    markInteraction();
                    setStep(1);
                  }}
                >
                  ← Back
                </button>

                <button
                  className="primary-button"
                  disabled={!methodQuestion.trim() || methodQuestion.length < 16 || methodQuestion.length > 300}
                  onClick={() => {
                    markInteraction();
                    setStep(3);
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}


          {/* QUESTION 3 */}

          {step === 3 && (
            <div className="question">
              <span className="question-number">
                Question 3 of 3
              </span>

              <h2>
                Tell us a little more about how you study
              </h2>

              <textarea
            
                value={extraContext}
                onChange={(e) => {
                  markInteraction();
                  setExtraContext(e.target.value);
                }}
                placeholder="I mainly study from textbooks and videos..."
              />

              <div className="button-area">
                <button
                  className="secondary-button"
                  onClick={() => {
                    markInteraction();
                    setStep(2);
                  }}
                >
                  ← Back
                </button>

                <button
                  className="primary-button ai-submit"
                  onClick={handleAskAI}
                  disabled={
                    loading
                    || quotaAccess?.remaining === 0
                  }
                >
                  {loading
                    ? "Finding your methods..."
                    : "Get My Recommendations ✦"}
                </button>
              </div>
            </div>
          )}


          {/* ERROR */}

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}


          {/* AI RESULT */}

          {step === 4 && result && (
            <div className="ai-results">

              <span className="result-label">
                YOUR EDULIENCE PLAN
              </span>

              <h2>Your Study Situation</h2>

              <p className="problem-summary">
                {result.user_problem}
              </p>


              <h2>Recommended Methods</h2>

              <div className="recommendations">
                {result.recommended_methods.map(
                  (method, index) => (
                    <article
                      className="method-card"
                      key={method.name}
                    >
                      <span className="method-number">
                        0{index + 1}
                      </span>

                      <div>
                        <h3>{method.name}</h3>

                        <span className="method-branch">
                          {method.branch}
                        </span>

                        <p>
                          <strong>Why this fits you</strong>
                          {method.reason}
                        </p>

                        <p className="warning">
                          <strong>Keep in mind</strong>
                          {method.warning}
                        </p>
                      </div>
                    </article>
                  )
                )}
              </div>


              <div className="study-plan">
                <h2>Your Study Plan</h2>
                <p>{result.study_plan}</p>
              </div>


              <div className="final-note">
                <p>{result.final_note}</p>
              </div>


              <button
                className="restart-button"
                onClick={restart}
              >
                Start Again
              </button>

            </div>
          )}

        </div>
      </div>
    </section>
  );
}
