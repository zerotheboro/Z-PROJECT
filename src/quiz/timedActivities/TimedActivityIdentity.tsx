import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { LocalActivityIdentity } from "./commitment";
const Identity = createContext<LocalActivityIdentity | null>(null);
export function TimedActivityIdentity({ value, children }: { value: LocalActivityIdentity; children: ReactNode }) {
  return <Identity.Provider value={value}>{children}</Identity.Provider>;
}
export const useTimedActivityIdentity = () => useContext(Identity);
