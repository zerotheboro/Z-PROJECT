import { Link, useLocation } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import NAV from "../HEADER/header";
import { useCumulativeProfile } from "../hooks/useCumulativeProfile";
import CumulativeProfileDashboard from "../components/CumulativeProfileDashboard";
import "../components/CumulativeProfile.scss";
import { localCumulativeProfileConfig } from "../services/localCumulativeProfileConfig";
const SyntheticProfilePreview = lazy(() => import("../components/SyntheticProfilePreview"));

export default function CumulativeLearningProfilePage() {
  const location = useLocation();
  const synthetic = localCumulativeProfileConfig()?.acceptedPreview === true && new URLSearchParams(location.search).get("preview") === "synthetic";
  const state = useCumulativeProfile(!synthetic);
  const [publishing, setPublishing] = useState(false);
  const [publicationError, setPublicationError] = useState(false);
  const publish = async () => {
    if (publishing) return;
    setPublishing(true); setPublicationError(false);
    try { await state.publishSynthetic(); state.refresh(); }
    catch { setPublicationError(true); }
    finally { setPublishing(false); }
  };
  return <div className="profile-workspace">
    <a className="cumulative-skip" href="#cumulative-profile-main" onClick={event => {
      const main = document.getElementById("cumulative-profile-main");
      if (!main) return;
      event.preventDefault(); event.stopPropagation();
      main.focus({ preventScroll: true }); main.scrollIntoView();
    }}>Skip to learning evidence</a>
    <NAV />
    {localCumulativeProfileConfig()?.syntheticPublished && !synthetic && state.uid && <div className="cumulative-actions">
      <button type="button" disabled={publishing} onClick={() => void publish()}>{publishing ? "Verifying synthetic generation..." : "Aggregate and publish synthetic profile"}</button>
      {publicationError && <p role="alert">Synthetic publication was not confirmed. Refresh or retry. Accepted evidence remains recorded; no legacy write was attempted.</p>}
    </div>}
    {synthetic ? <Suspense fallback={<main className="cumulative-profile profile-state" id="cumulative-profile-main" tabIndex={-1}><p role="status">Loading synthetic preview...</p></main>}><SyntheticProfilePreview /></Suspense>
      : state.data && state.uid ? <CumulativeProfileDashboard key={state.uid} data={state.data} refresh={state.refresh} />
      : <main className="cumulative-profile profile-state" id="cumulative-profile-main" tabIndex={-1} aria-busy={state.loading}>
        <p className="cumulative-eyebrow">LOCAL DEMO · LEARNING EVIDENCE</p><h1>Your learning, over time</h1>
        {state.loading ? <p role="status">Loading your recorded learning evidence...</p>
          : state.signedOut ? <><h2>Sign in to your local demo account</h2><p>Guest Training remains available. Browser-only guest work is not imported into an account or presented as authenticated cumulative evidence.</p>
            {localCumulativeProfileConfig()?.acceptedPreview && <Link to="/training/profile?preview=synthetic">Open synthetic student preview</Link>}</>
            : <><p role="alert">{state.error}</p><button type="button" onClick={state.refresh}>Retry loading evidence</button></>}
        <Link to="/training">Back to Training</Link>
      </main>}
  </div>;
}
