import type {
  TrainingStreakState
} from "../quiz/trainingStreak";

type Props = TrainingStreakState & {
  loading: boolean;
  error: string | null;
};

function TrainingStreakCard({
  loading,
  error,
  currentStreak,
  longestStreak,
  totalActiveDays,
  completedToday
}: Props) {
  if (loading) {
    return (
      <section className="training-streak-card" aria-busy="true">
        <p>DAILY TRAINING</p>
        <h2>Loading your streak...</h2>
      </section>
    );
  }

  if (error) {
    return (
      <section className="training-streak-card">
        <p>DAILY TRAINING</p>
        <h2>Streak unavailable</h2>
        <p role="status">
          Your training options are still available.
        </p>
      </section>
    );
  }

  return (
    <section className="training-streak-card">
      <p>DAILY TRAINING</p>
      <h2>
        {currentStreak > 0
          ? `🔥 ${currentStreak} day streak`
          : "🔥 Start a new streak"}
      </h2>
      <p className={completedToday
        ? "training-streak-today is-complete"
        : "training-streak-today"}
      >
        {completedToday
          ? "You've trained today ✓"
          : currentStreak > 0
            ? "Complete one training today to keep your streak alive."
            : "Complete one training today."}
      </p>
      <div className="training-streak-details">
        <span>Longest streak: {longestStreak} days</span>
        <span>Total active days: {totalActiveDays}</span>
      </div>
    </section>
  );
}

export default TrainingStreakCard;
