import { useState } from "react";
import './AISTYLE.scss';


let AI_credit = JSON.parse(localStorage.getItem("AI_credits"));

if(AI_credit === null){ localStorage.setItem("AI_credits", "2");  AI_credit = 2; console.log(AI_credit)};

export default function AIRecommendation() {
  const [step, setStep] = useState(0);

  const [biggestProblem, setBiggestProblem] = useState("");
  const [methodQuestion, setMethodQuestion] = useState("");
  const [extraContext, setExtraContext] = useState("");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAskAI() {
    AI_credit -= 1;
    localStorage.setItem("AI_credits", JSON.stringify(AI_credit));
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "https://z-project-ba3t.onrender.com/api/recommend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            biggestProblem,
            methodQuestion,
            extraContext,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get recommendation");
      }

      const data = await response.json();

      setResult(data);
      setStep(4);
    } catch (err) {
      console.error(err);
      setError("Could not get an AI recommendation.");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setBiggestProblem("");
    setMethodQuestion("");
    setExtraContext("");
    setResult(null);
    setError("");
    setStep(0);
  }

  return (
    <section className="ai-adviser">
      <div className="ai-container">
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
                Explore your top 3 Edulience's SSS  
              </h2>
              <p>
                Receive 3 "SSS" or Suitable Study Strategies and a study plan only after 1-2 minutes submiting your answers for every day you log in the website
              </p>

              <div className="button-area">
                <button
                  className="primary-button"
                  onClick={() => setStep(1)}
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
                onChange={(e) =>
                  setBiggestProblem(e.target.value)
                }
                placeholder="I get distracted easily and forget what I study..."
              />

              <div className="button-area">
                <button
                  className="secondary-button"
                  onClick={() => setStep(0)}
                >
                  ← Back
                </button>

                <button
                  className="primary-button"
                  disabled={!biggestProblem.trim() || biggestProblem.length < 16 || biggestProblem.length > 300}
                  onClick={() => setStep(2)}
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
                onChange={(e) =>
                  setMethodQuestion(e.target.value)
                }
                placeholder="Which study methods would work best for me?"
              />

              <div className="button-area">
                <button
                  className="secondary-button"
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>

                <button
                  className="primary-button"
                  disabled={!methodQuestion.trim() || methodQuestion.length < 16 || methodQuestion.length > 300}
                  onClick={() => setStep(3)}
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
                onChange={(e) =>
                  setExtraContext(e.target.value)
                }
                placeholder="I mainly study from textbooks and videos..."
              />

              <div className="button-area">
                <button
                  className="secondary-button"
                  onClick={() => setStep(2)}
                >
                  ← Back
                </button>

                <button
                  className="primary-button ai-submit"
                  onClick={handleAskAI}
                  disabled={loading || AI_credit === 0}
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