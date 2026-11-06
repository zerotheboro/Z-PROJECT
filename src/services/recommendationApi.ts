export const DEFAULT_RECOMMENDATION_API_BASE =
  "https://z-project-ba3t.onrender.com";

type RecommendationApiEnvironment = {
  DEV?: boolean;
  PROD?: boolean;
  VITE_API_BASE_URL?: unknown;
};

function isLoopbackHostname(value: string): boolean {
  const hostname = value.toLowerCase().replace(/\.$/, "");
  return hostname === "localhost" || hostname.endsWith(".localhost")
    || /^127\./.test(hostname) || hostname === "[::1]"
    || /^\[::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}\]$/.test(hostname);
}

/** Build-time configuration only; never derive a backend from user inputs or the page URL. */
export function resolveRecommendationApiBase(
  override?: string,
  environment: RecommendationApiEnvironment = import.meta.env,
  pageHostname: string | undefined = typeof window === "undefined" ? undefined : window.location.hostname
): string {
  const configured = override ?? environment.VITE_API_BASE_URL;
  const value = configured === undefined || configured === ""
    ? DEFAULT_RECOMMENDATION_API_BASE
    : typeof configured === "string" ? configured.trim() : "";
  const invalid = () => new Error("Invalid recommendation API base URL configuration.");
  if (!value || /[\u0000-\u0020\\?#]/.test(value)) throw invalid();

  let url: URL;
  try { url = new URL(value); } catch { throw invalid(); }
  if (url.username || url.password) throw invalid();

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const loopback = isLoopbackHostname(hostname);
  const unspecified = ["0.0.0.0", "[::]", "[::ffff:0:0]"].includes(hostname);
  const development = environment.DEV === true && environment.PROD !== true;
  const publicPage = pageHostname !== undefined && !isLoopbackHostname(pageHostname);
  if (unspecified || (loopback && (!development || publicPage))) throw invalid();
  if (url.protocol !== "https:" && !(development && loopback && url.protocol === "http:")) throw invalid();

  return url.origin + url.pathname.replace(/\/+$/, "");
}
