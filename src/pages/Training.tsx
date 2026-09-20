import {
  useNavigate
} from "react-router-dom";

import LearningProfileStatus
  from "../components/LearningProfileStatus";

import NAV from "../HEADER/header";

function Training() {

  const navigate =
    useNavigate();

  return (
    <>
    <NAV/>
    <main className="training-page">
      
      <section className="training-hero">

        <p>
          EDULIENCE TRAINING
        </p>

        <h1>
          Train how you learn.
        </h1>

        <p>
          Test learning strategies,
          discover which approaches work
          for you, and build a learning
          profile that improves over time.
        </p>

      </section>

      <LearningProfileStatus

        onLogin={() =>
          navigate("/login")
        }

        onStartAssessment={() =>
          navigate(
            "/training/assessment"
          )
        }

        onViewProfile={() =>
          navigate(
            "/training/profile"
          )
        }

      />

    </main>
    </>
  );
}

export default Training;