import {
  useState
} from "react";

type Props = {
  loading: boolean;
  error: string | null;
  plan: "free" | "premium";
  unlimited: boolean;
  testMeUsed: number;
  testMeLimit: number;
  manualMethodsUsed: number;
  manualMethodsLimit: number;
};

function TrainingAccessCard({
  loading,
  error,
  plan,
  unlimited,
  testMeUsed,
  testMeLimit,
  manualMethodsUsed,
  manualMethodsLimit
}: Props) {
  const [showComingSoon, setShowComingSoon] =
    useState(false);

  return (
    <section
      className={`training-access-card ${unlimited ? "premium" : "free"}`}
      aria-labelledby="training-access-heading"
    >
      <div>
        <p className="training-access-plan">
          {unlimited ? "PREMIUM" : "FREE PLAN"}
        </p>
        <h2 id="training-access-heading">
          {unlimited
            ? "Unlimited Training"
            : "Today's Training access"}
        </h2>
      </div>

      {loading && <p>Checking today's access...</p>}
      {!loading && error && (
        <p role="alert">{error}</p>
      )}

      {!loading && !error && unlimited && (
        <div className="training-access-usage">
          <p><strong>Unlimited</strong> Test Me</p>
          <p><strong>Unlimited</strong> method testing</p>
        </div>
      )}

      {!loading && !error && !unlimited && (
        <div className="training-access-usage">
          <p>
            <span>Test Me</span>
            <strong>
              {testMeUsed} / {testMeLimit} used today
            </strong>
          </p>
          <p>
            <span>Method tests</span>
            <strong>
              {manualMethodsUsed} / {manualMethodsLimit} used today
            </strong>
          </p>
        </div>
      )}

      {!unlimited && (
        <div className="training-upgrade-cta">
          <p>Upgrade for unlimited Training.</p>
          <button
            type="button"
            className="secondary-action"
            onClick={() => setShowComingSoon(true)}
          >
            Upgrade
          </button>
          {showComingSoon && (
            <p role="status">
              Premium checkout is coming next.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default TrainingAccessCard;
