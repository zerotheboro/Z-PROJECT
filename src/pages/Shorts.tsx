import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";

import NAV from "../HEADER/header";
import {
  getShortEmbedUrl,
  SHORT_VIDEOS
} from "../shorts/shortVideos";

import "./Shorts.scss";

function Shorts() {
  const feedRef = useRef<HTMLElement | null>(null);
  const ratiosRef = useRef(new Map<string, number>());
  const [activeId, setActiveId] = useState<string | null>(
    SHORT_VIDEOS[0]?.id ?? null
  );

  useLayoutEffect(() => {
    const feed = feedRef.current;

    if (feed) {
      feed.scrollTop = 0;
    }

    setActiveId(SHORT_VIDEOS[0]?.id ?? null);
  }, []);

  useEffect(() => {
    const feed = feedRef.current;

    if (!feed || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const id = (
            entry.target as HTMLElement
          ).dataset.shortId;

          if (id) {
            ratiosRef.current.set(
              id,
              entry.isIntersecting
                ? entry.intersectionRatio
                : 0
            );
          }
        });

        let nextActive: string | null =
          SHORT_VIDEOS[0]?.id ?? null;
        let highestRatio = 0;

        SHORT_VIDEOS.forEach(video => {
          const ratio = ratiosRef.current.get(video.id) ?? 0;

          if (ratio > highestRatio) {
            highestRatio = ratio;
            nextActive = video.id;
          }
        });

        if (highestRatio > 0 && nextActive) {
          setActiveId(nextActive);
        }
      },
      {
        root: feed,
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    );

    feed
      .querySelectorAll<HTMLElement>("[data-short-id]")
      .forEach(item => {
        ratiosRef.current.set(item.dataset.shortId ?? "", 0);
        observer.observe(item);
      });

    return () => {
      observer.disconnect();
      ratiosRef.current.clear();
    };
  }, []);

  return (
    <>
      <NAV />
      <main className="shorts-page">
        <section
          className="shorts-feed"
          ref={feedRef}
          aria-label="Edulience Shorts"
        >
          {SHORT_VIDEOS.map((video, index) => {
            const active = video.id === activeId;

            return (
              <article
                className={`shorts-item${
                  active ? " is-active" : ""
                }`}
                data-short-id={video.id}
                data-active={String(active)}
                aria-current={active ? "true" : undefined}
                aria-label={`${video.title}, ${index + 1} of ${SHORT_VIDEOS.length}`}
                key={video.id}
              >
                <div className="shorts-player-shell">
                  <iframe
                    src={getShortEmbedUrl(
                      video.youtubeId,
                      active
                    )}
                    title={`${video.title} video`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />

                  <div className="shorts-caption">
                    {/*<span>EDULIENCE SHORTS</span>
                    <h1>{video.title}</h1>
                    <p>{index + 1} / {SHORT_VIDEOS.length}</p>*/}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </>
  );
}

export default Shorts;
