import {
  useNavigate
} from "react-router-dom";

import NAV from "../HEADER/header";

import {
  useUserProfile
} from "../hooks/useUserProfile";

import Results
  from "../quiz/sections/Results";


function LearningProfilePage() {

  const navigate =
    useNavigate();

  const {
    user,
    learningProfile,
    loading
  } = useUserProfile();


  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <>
        <NAV />

        <main className="learning-profile-page">
          Loading your learning profile...
        </main>
      </>
    );
  }


  // =========================
  // NOT LOGGED IN
  // =========================

  if (!user) {
    return (
      <>
        <NAV />

        <main
          className="
            learning-profile-page
            learning-profile-empty
          "
        >

          <h1>
            Sign in to view your
            learning profile
          </h1>

          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
          >
            Go back
          </button>

        </main>
      </>
    );
  }


  // =========================
  // LOGGED IN BUT NO PROFILE
  // =========================

  if (!learningProfile) {
    return (
      <>
        <NAV />

        <main
          className="
            learning-profile-page
            learning-profile-empty
          "
        >

          <p>
            EDULIENCE TRAINING
          </p>

          <h1>
            You don't have a learning
            profile yet.
          </h1>

          <p>
            Complete the assessment to
            test different learning
            methods and build your
            personal profile.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/training/assessment"
              )
            }
          >
            Start assessment
          </button>

        </main>
      </>
    );
  }


  // =========================
  // PROFILE EXISTS
  // =========================

  return (
    <>
      <NAV />

      <main className="learning-profile-page">

        <Results
          profile={
            learningProfile
          }
        />

        <div className="profile-actions">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/training/assessment"
              )
            }
          >
            Retake assessment
          </button>

        </div>

      </main>
    </>
  );
}

export default LearningProfilePage;