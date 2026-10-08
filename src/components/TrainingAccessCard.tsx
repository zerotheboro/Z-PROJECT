type Props = {
  loading: boolean;
  error: string | null;
  plan: "free" | "premium";
  planSource: "default" | "manual" | "paddle";
  signedIn: boolean;
  unlimited: boolean;
  testMeUsed: number;
  testMeLimit: number;
  manualMethodsUsed: number;
  manualMethodsLimit: number;
  billingBusy: boolean;
  billingError: string | null;
  billingMessage: string | null;
  onUpgrade: () => void;
  onManageSubscription: () => void;
};

function TrainingAccessCard({
  loading,
  error,
  plan,
  planSource,
  signedIn,
  unlimited,
  testMeUsed,
  testMeLimit,
  manualMethodsUsed,
  manualMethodsLimit,
  billingBusy,
  billingError,
  billingMessage,
  onUpgrade,
  onManageSubscription
}: Props) {
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

      {planSource === "paddle" ? (
        <div className="training-upgrade-cta">
          <button
            type="button"
            className="secondary-action"
            disabled={billingBusy}
            onClick={onManageSubscription}
          >
            {billingBusy
              ? "Opening subscription..."
              : "Manage subscription"}
          </button>
        </div>
      ) : !unlimited && (
        <div className="training-upgrade-cta">
          <p>Upgrade for unlimited Training.</p>
          <button
            type="button"
            className="secondary-action"
            disabled={billingBusy}
            onClick={onUpgrade}
          >
            {billingBusy
              ? "Opening checkout..."
              : signedIn
                ? "Upgrade to Premium"
                : "Sign in to upgrade"}
          </button>
        </div>
      )}

      {billingError && (
        <p role="alert">{billingError}</p>
      )}
      {billingMessage && (
        <p role="status">{billingMessage}</p>
      )}
    </section>
  );
}

export default TrainingAccessCard;
