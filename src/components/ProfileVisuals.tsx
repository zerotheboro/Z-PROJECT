import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export type ProfileIconName = "overview" | "methods" | "history" | "progress" | "arrow" | "book";
const paths: Record<ProfileIconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  methods: <><path d="m12 3 10 5-10 5L2 8Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  history: <><path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7" /><path d="M12 7v5l3 2" /></>,
  progress: <><path d="M4 4v16h16M7 15l4-5 4 2 5-7" /><path d="M16 5h4v4" /></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
  book: <><path d="M12 5C8 2 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-6-2-10 1Zm0 0v16" /></>
};
export function ProfileIcon({ name, className = "" }: { name: ProfileIconName; className?: string }) {
  return <svg className={`profile-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
export const profileSections = [
  { id: "learning-overview", label: "Overview", icon: "overview" },
  { id: "method-evidence", label: "Method evidence", icon: "methods" },
  { id: "learning-history", label: "History", icon: "history" },
  { id: "learning-progress", label: "Progress", icon: "progress" }
] as const;

export function ProfileRail({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return <aside className="profile-rail">
    <div className="profile-rail-title"><span className="profile-brand-mark"><ProfileIcon name="book" /></span><div><strong>Your learning space</strong><span>Curiosity looks good on you.</span></div></div>
    <nav aria-label="Learning profile sections">{profileSections.map(section => <a key={section.id} href={`#${section.id}`}
      aria-current={active === section.id ? "location" : undefined} onClick={event => {
        // A fragment navigation would replace the application's HashRouter route.
        event.preventDefault();
        event.stopPropagation();
        onSelect(section.id);
        const target = document.getElementById(section.id);
        target?.scrollIntoView?.({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        target?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
      }}>
      <ProfileIcon name={section.icon} /><span>{section.label}</span><span className="profile-nav-arrow" aria-hidden="true">↗</span>
    </a>)}</nav>
    <div className="profile-rail-note"><ProfileIcon name="book" /><p className="profile-rail-message">Small experiments.<br />Useful discoveries.</p><p>Try a method on different material. See what you notice.</p>
      <Link to="/training">Explore Training <ProfileIcon name="arrow" /></Link></div>
  </aside>;
}

export function ProfileSectionTitle({ number, title, description, id }: { number: string; title: string; description: string; id: string }) {
  return <div className="profile-section-heading"><div><p className="profile-section-kicker">{number} / YOUR LEARNING</p><h2 id={id} tabIndex={-1}>{title}</h2><p>{description}</p></div></div>;
}

export function validTaskScore(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}
export function TaskScoreBar({ label, score, tone = "teal" }: { label: string; score: number | null; tone?: "teal" | "coral" }) {
  const known = validTaskScore(score);
  return <div className={`profile-score-bar ${tone}`}>
    <div><span>{label}</span><strong>{known ? `${Math.round(score * 100)}%` : "Not recorded"}</strong></div>
    <div className="profile-score-track" aria-hidden="true">{known && <span style={{ width: `${score * 100}%` }} />}</div>
  </div>;
}
