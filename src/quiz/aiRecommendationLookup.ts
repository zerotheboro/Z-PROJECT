export const AI_RECOMMENDATION_LOOKUP_TIMEOUT_MS = 2_000;

// Firestore reads cannot be cancelled here. Promise.race observes a late
// rejection, while the caller commits selection only from this result.
export async function loadRecommendationWithin<T>(
  load: () => Promise<T>,
  timeoutMs = AI_RECOMMENDATION_LOOKUP_TIMEOUT_MS
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(load),
      new Promise<null>(resolve => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  } catch {
    return null;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
