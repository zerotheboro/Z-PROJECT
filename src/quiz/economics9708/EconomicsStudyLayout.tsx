import { createContext, useCallback, useContext, useId, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";

const StudyContext = createContext<{
  enabled: boolean; owner?: string; register: (id: string) => () => void;
  image: ReactNode; reference: ReactNode;
} | null>(null);

/** Presentation only. No resumable slots or evidence fields are introduced. */
export function EconomicsStudyPanels({ enabled, image, reference, children }: {
  enabled: boolean; image: ReactNode; reference: ReactNode; children: ReactNode;
}) {
  const [panels, setPanels] = useState<string[]>([]);
  const register = useCallback((id: string) => {
    setPanels(current => current.includes(id) ? current : [...current, id]);
    return () => setPanels(current => current.filter(panel => panel !== id));
  }, []);
  return <StudyContext.Provider value={{ enabled, owner: panels[0], register, image, reference }}>
    {enabled && !panels.length && <div className="study-content" data-material-surface>
      <EconomicsPassageLayout image={image}>{reference}</EconomicsPassageLayout>
    </div>}
    {children}
  </StudyContext.Provider>;
}

export function EconomicsPassageLayout({ image, children }: { image: ReactNode; children: ReactNode }) {
  return <div className="economics-study-layout">
    <div className="economics-study-illustration">{image}</div>
    <div className="economics-study-passage">{children}</div>
  </div>;
}

export function useEconomicsStudyPanel(children: ReactNode) {
  const context = useContext(StudyContext), id = useId();
  const register = context?.register;
  const enabled = context?.enabled === true;
  useLayoutEffect(() => enabled && register ? register(id) : undefined, [enabled, register, id]);
  return enabled && context.owner === id
    ? <EconomicsPassageLayout image={context.image}>{children}{context.reference}</EconomicsPassageLayout>
    : children;
}
