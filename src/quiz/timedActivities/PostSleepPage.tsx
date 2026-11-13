import { useLocation, useNavigate } from "react-router-dom";
import NAV from "../../HEADER/header";
import PostSleepPanel from "./PostSleepPanel";
import { economicsPacks } from "../economics9708/packs";
import "../TrainingExperience.scss";

export default function PostSleepPage({ ownerPreview = false }: { ownerPreview?: boolean }) {
  const location = useLocation(), navigate = useNavigate();
  const requestedTopic = new URLSearchParams(location.search).get("economics") ?? "";
  const topicId = economicsPacks.some(pack => pack.topicId === requestedTopic) ? requestedTopic : "";
  return <><NAV /><main className="assessment assessment-v2">
    <section className="method-lab">
      <PostSleepPanel topicId={topicId} previewOnly={ownerPreview} />
      <button type="button" onClick={() => navigate("/training/choose" + (topicId ? `?economics=${topicId}` : ""))}>Back to methods</button>
    </section>
  </main></>;
}
