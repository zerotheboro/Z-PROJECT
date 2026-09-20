import { createRoot } from "react-dom/client";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import "./index.scss";

import Tips
  from "./MIDSECTION/section_of_each_tips.jsx";

import Training
  from "./pages/Training";

import Assessment
  from "./quiz/Assessment";

import LearningProfilePage
  from "./pages/LearningProfilePage";

import Footer
  from "./footer.jsx";

import Hall_of_fame
  from "./MIDSECTION/HALL_of_fame.jsx";

import Table
  from "./MIDSECTION/TABLE.jsx";

import "./quiz/TrainingExperience.scss";

  createRoot(
  document.getElementById("root-render")
).render(

  <BrowserRouter
    basename={import.meta.env.BASE_URL}
  >

    <Routes>

      <Route
        path="/"
        element={<Tips />}
      />

      <Route
        path="/training"
        element={<Training />}
      />

      <Route
        path="/training/assessment"
        element={<Assessment />}
      />

      <Route
        path="/training/profile"
        element={<LearningProfilePage />}
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>

  </BrowserRouter>

);








































