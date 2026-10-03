type Props = {
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function DiscardTrainingDialog({
  busy = false,
  error,
  onCancel,
  onConfirm
}: Props) {
  return (
    <div
      className="training-dialog-backdrop"
      role="presentation"
    >
      <section
        className="training-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discard-training-title"
      >
        <h2 id="discard-training-title">
          Discard current training?
        </h2>

        <p>
          This will delete your unfinished training session.
          <br />
          Your Learning Profile and completed assessment history will not be affected.
        </p>

        {error && (
          <p className="training-save-error" role="alert">
            {error}
          </p>
        )}

        <div className="training-dialog-actions">
          <button
            type="button"
            className="secondary-action"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Discarding..." : "Discard training"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DiscardTrainingDialog;
