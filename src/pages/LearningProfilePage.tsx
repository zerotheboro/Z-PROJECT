import { useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import NAV from "../HEADER/header";
import { useUserProfile } from "../hooks/useUserProfile";
import LatestProfileDashboard from "../components/LatestProfileDashboard";
import { ProfileIcon } from "../components/ProfileVisuals";
import { localCumulativeProfileConfig } from "../services/localCumulativeProfileConfig";
import { useManualTrainingHistory } from "../hooks/useManualTrainingHistory";

const LocalCumulativeProfilePage = lazy(() => import("./CumulativeLearningProfilePage"));

function LatestLearningProfilePage() {
  const navigate = useNavigate();
  const { user, learningProfile, loading } = useUserProfile();
  const manual = useManualTrainingHistory(user?.uid ?? null);
  return <><div className="profile-workspace"><NAV />
    {loading ? <main className="cumulative-profile profile-state" id="cumulative-profile-main" tabIndex={-1} aria-busy="true">
      <span className="profile-state-icon"><ProfileIcon name="book" /></span><p className="cumulative-eyebrow">YOUR LEARNING SPACE</p>
      <p role="status">Loading your learning profile...</p><div className="profile-skeleton" aria-hidden="true"><span /><span /><span /></div>
    </main> : !user ? <main className="cumulative-profile profile-state" id="cumulative-profile-main" tabIndex={-1}>
      <span className="profile-state-icon"><ProfileIcon name="book" /></span><p className="cumulative-eyebrow">YOUR LEARNING SPACE</p>
      <h1>Sign in to view your learning profile</h1><p>Your study experiments belong to you. Sign in through Edulience to view your saved results.</p>
      <button type="button" onClick={() => navigate("/")}>Go back</button>
    </main> : !learningProfile && !manual.records.length && !manual.assessments?.length && !manual.loading && !manual.error ? <main className="cumulative-profile profile-state" id="cumulative-profile-main" tabIndex={-1}>
      <span className="profile-state-icon"><ProfileIcon name="methods" /></span><p className="cumulative-eyebrow">EDULIENCE TRAINING</p>
      <h1>You don't have a learning profile yet.</h1><p>Complete the assessment to test different learning methods and build your personal profile.</p>
      <p>Older individual Training recorded activity only. Cumulative profile publication is not enabled for genuine accounts.</p>
      <button type="button" onClick={() => navigate("/training/assessment")}>Start assessment</button>
      <button type="button" onClick={manual.refresh}>Refresh Training history</button>
    </main> : <LatestProfileDashboard key={user.uid} ownerUid={user.uid} profile={learningProfile} manual={{ ...manual, uid: user.uid }} cumulativeAvailable={Boolean(localCumulativeProfileConfig())} />}
  </div>
  <div className='border_footer section_border'/></>;
}

export default function LearningProfilePage() {
  const location = useLocation();
  // Preserve the verified local-only cumulative gate and the latest-snapshot escape hatch.
  if (localCumulativeProfileConfig() && new URLSearchParams(location.search).get("view") !== "latest") {
    return <Suspense fallback={<div className="profile-workspace"><main className="cumulative-profile profile-state" id="cumulative-profile-main" tabIndex={-1}><p role="status">Loading recorded learning evidence...</p></main></div>}><LocalCumulativeProfilePage /></Suspense>;
  }
  return <LatestLearningProfilePage />;
}
