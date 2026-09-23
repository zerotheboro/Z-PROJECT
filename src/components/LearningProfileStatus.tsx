import {
  useUserProfile
} from "../hooks/useUserProfile";

type Props = {
  onStartAssessment: () => void;
  onViewProfile: () => void;
  onLogin: () => void;
};

import {
    loginWithGoogle
} from "../services/auth";

function LearningProfileStatus({
  onStartAssessment,
  onViewProfile,
  onLogin
}: Props) {

  const {
    user,
    learningProfile,
    loading
  } = useUserProfile();


  // Firebase is still checking login/profile
  if (loading) {
    return (
      <div>
        Loading your learning profile...
      </div>
    );
  }


  // Not logged in
  if (!user) {
    return (
      <section>

        <h2>
          Discover how you learn
        </h2>

        <p>
          Sign in to build and save
          your Edulience learning profile.
        </p>

         <button
          type="button"
          className="nav-sign-in"
          onClick={async () => {

              try {

                  const user =
                      await loginWithGoogle();

                  console.log(
                      "Logged in:",
                      user.uid,
                      user.email
                  );

              } catch (error) {

                  console.error(
                      "Login failed:",
                      error
                  );
              }

          }}
      >
          Sign in
      </button>

      </section>
    );
  }


  // Logged in, but no assessment/profile yet
  if (!learningProfile) {
    return (
      <section>

        <h2>
          Build your learning profile
        </h2>

        <p>
          Complete the Edulience
          assessment to discover which
          learning methods work best
          for you.
        </p>

        <button
          type="button"
          onClick={
            onStartAssessment
          }
        >
          Start assessment
        </button>

      </section>
    );
  }


  // Logged in + profile exists
  return (
    <section>

      <p>
        YOUR LEARNING PROFILE
      </p>

      <h2>
        Welcome back,
        {" "}
        {user.displayName ?? "learner"}
      </h2>

      <p>
        You already have an Edulience
        learning profile.
      </p>

      <button
        type="button"
        onClick={
          onViewProfile
        }
      >
        View my profile
      </button>

      <button
        type="button"
        onClick={
          onStartAssessment
        }
      >
        Retake assessment
      </button>

    </section>
  );
}

export default LearningProfileStatus;