export type ShortVideo = {
  id: string;
  youtubeId: string;
  title: string;
  methodId?: string;
  tags?: readonly string[];
  category?: string;
};

export const SHORT_VIDEOS = [
  {
    id: "short-1",
    youtubeId: "qW63_zEqnJw",
    title: "Edulience Short 1"
  },
  {
    id: "short-2",
    youtubeId: "mC5T9H9rj94",
    title: "Edulience Short 2"
  },
  {
    id: "short-3",
    youtubeId: "KkWofMnrlBU",
    title: "Edulience Short 3"
  },
  {
    id: "short-4",
    youtubeId: "XhXGsHC7ZxA",
    title: "Edulience Short 4"
  },
  {
    id: "short-4",
    youtubeId: "z6EhhEffxRA",
    title: "Edulience Short 4"
  },
  {
    id: "short-4",
    youtubeId: "mJwDQL0D67M",
    title: "Edulience Short 4"
  }

  

  
] as const satisfies readonly ShortVideo[];

export function getShortEmbedUrl(
  youtubeId: string,
  active: boolean
): string {
  const parameters = new URLSearchParams({
    autoplay: active ? "1" : "0",
    mute: "1",
    playsinline: "1",
    rel: "0"
  });

  return `https://www.youtube.com/embed/${encodeURIComponent(
    youtubeId
  )}?${parameters.toString()}`;
}
