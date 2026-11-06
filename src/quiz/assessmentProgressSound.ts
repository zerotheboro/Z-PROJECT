// Existing owner-supplied asset. Keep its actual casing for Linux hosting.
export const ASSESSMENT_PROGRESS_SOUND_SOURCE: string | null =
  `${import.meta.env.BASE_URL}sounds/section-complete.MP3`;

export type ProgressAudio = Pick<HTMLAudioElement, "play" | "pause" | "currentTime"> & { volume?: number };

export function createAssessmentProgressSound(
  source: string | null,
  createAudio: (source: string) => ProgressAudio = source => new Audio(source)
) {
  let audio: ProgressAudio | null = null;
  return {
    play() {
      if (!source) return;
      try {
        audio ??= createAudio(source);
        audio.volume = 0.35;
        audio.currentTime = 0;
        // Playback never blocks navigation. Autoplay denial is harmless.
        void audio.play().catch(() => undefined);
      } catch { /* Missing audio support must not affect an answer. */ }
    },
    dispose() {
      try { audio?.pause(); } catch { /* Already unavailable. */ }
      audio = null;
    }
  };
}
