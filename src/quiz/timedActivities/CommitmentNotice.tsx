export const commitmentDisclosure = "While this timer runs, leaving this tab or browser is counted after a 1.5-second grace period. The first two interruptions show warnings; the third ends the attempt. The clock keeps running. Visibility only indicates interruption, not cheating. No camera, screen or other-tab content is accessed.";
export function CommitmentNotice({ exits, invalid, reason }: { exits: number; invalid?: boolean; reason?: string | null }) {
  return invalid ? <p role="alert">{reason ?? "This attempt is invalid. No result was scored."}</p>
    : exits > 0 ? <p role="alert">{exits === 1 ? "First interruption: please keep this tab visible while the timer runs." : "Final warning: one more confirmed interruption will end this attempt."}</p> : null;
}
