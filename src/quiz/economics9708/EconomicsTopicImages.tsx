import { useState } from "react";
import { resolveEconomicsImages } from "./topicImages";
const bundled = import.meta.glob<string>("../../image/economics9708/*.png", { eager: true, query: "?url", import: "default" });

function SourceFigure({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? null : <figure className="economics-topic-image">
    <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    <figcaption>{caption ?? alt}</figcaption>
  </figure>;
}
/** Study/reference surfaces only. Never mounted in a question or closed-note
 * test. Missing files produce no image, caption, heading or placeholder. */
export default function EconomicsTopicImages({ topicId, objectiveIds, assets = bundled }: {
  topicId: string; objectiveIds: readonly string[]; assets?: Readonly<Record<string, string>>;
}) {
  const images = resolveEconomicsImages(topicId, objectiveIds, assets);
  return images.length ? <div className="economics-topic-images">{images.map(image =>
    <SourceFigure key={`${image.filename}:${image.src}`} src={image.src} alt={image.alt} caption={image.caption} />)}</div> : null;
}
