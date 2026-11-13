export function ownerVideoPreviewEnabled(
  env = import.meta.env,
  location: Pick<Location, "hostname" | "protocol"> = window.location
): boolean {
  return env.DEV === true && env.VITE_ECONOMICS_VIDEO_PREVIEW === "owner-approved" &&
    location.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname);
}

