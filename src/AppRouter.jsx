import React, {
  useEffect,
  useLayoutEffect
} from "react";

import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation
} from "react-router-dom";

import Tips
  from "./MIDSECTION/section_of_each_tips.jsx";
import Library
  from "./pages/Library";
import LearningProfilePage
  from "./pages/LearningProfilePage";
import Shorts
  from "./pages/Shorts";
import Training
  from "./pages/Training";
import Assessment
  from "./quiz/Assessment";
import ChooseMethods
  from "./quiz/ChooseMethods";

function scrollToHashTarget(hash) {
  if (!hash || hash === "#") {
    return false;
  }

  const id = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(id);

  if (!target) {
    return false;
  }

  target.scrollIntoView();
  return true;
}

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (scrollToHashTarget(hash)) {
      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto"
    });
  }, [hash, pathname]);

  useEffect(() => {
    function preserveDocumentAnchor(event) {
      const element = event.target instanceof Element
        ? event.target
        : null;
      const anchor = element?.closest(
        'a[href^="#"]'
      );
      const href = anchor?.getAttribute("href");

      if (
        !href ||
        href === "#" ||
        href.startsWith("#/")
      ) {
        return;
      }

      if (scrollToHashTarget(href)) {
        event.preventDefault();
      }
    }

    document.addEventListener(
      "click",
      preserveDocumentAnchor
    );

    return () => {
      document.removeEventListener(
        "click",
        preserveDocumentAnchor
      );
    };
  }, []);

  return null;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Tips />} />
      <Route path="/library" element={<Library />} />
      <Route path="/training" element={<Training />} />
      <Route path="/shorts" element={<Shorts />} />
      <Route
        path="/training/assessment"
        element={<Assessment />}
      />
      <Route
        path="/training/choose"
        element={<ChooseMethods />}
      />
      <Route
        path="/training/profile"
        element={<LearningProfilePage />}
      />
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <HashRouter>
      <ScrollToTop />
      <AppRoutes />
    </HashRouter>
  );
}
