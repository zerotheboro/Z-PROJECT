export type ShortVideo = {
  id: string;
  youtubeId: string;
  title: string;
  methodId?: string;
  tags?: readonly string[];
  category?: string;
};

export let RAW_VIDEOS = [
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
    id: "short-5",
    youtubeId: "z6EhhEffxRA",
    title: "Edulience Short 4"
  },
  {
    id: "short-6",
    youtubeId: "mJwDQL0D67M",
    title: "Edulience Short 4"
  },
  {
    id: "short-7",
    youtubeId: "gb8Bz8l_ILQ",
    title: "Edulience Short 4"
  },
  {
    id: "short-8",
    youtubeId: "AEO-GMWnfIM",
    title: "Edulience Short 4"
  },
  {
    id: "short-9",
    youtubeId: "bh7jRjyIg5c",
    title: "Edulience Short 4"
  },
  {
    id: "short-10",
    youtubeId: "z7O_B2ahx8s",
    title: "Edulience Short 4"
  },
  {
    id: "short-11",
    youtubeId: "4-TkN4ta9cY",
    title: "Edulience Short 4"
  },
  {
    id: "short-4",
    youtubeId: "DrH9t6XNA7M",
    title: "Edulience Short 4"
  },
  {
    id: "short-4",
    youtubeId: "AEO-GMWnfIM",
    title: "Edulience Short 4"
  },
  {
    id: "short-4",
    youtubeId: "DsgxD40nPVc",
    title: "Edulience Short 4"
  },
  {
    id: "short-4",
    youtubeId: "ULJjo37h55s",
    title: "Edulience Short 4"
  },
]

function scrambleArray<T>(array: T[]): T[] {
  // Create a shallow copy to keep the function pure
  const scrambled = [...array]; 
  
  for (let i = scrambled.length - 1; i > 0; i--) {
    // Generate a random index from 0 to i
    const j = Math.floor(Math.random() * (i + 1));
    
    // Swap elements using destructuring assignment
    [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
  }
  
  return scrambled;
}

 
  

  
export const SHORT_VIDEOS = scrambleArray(RAW_VIDEOS) satisfies readonly ShortVideo[];

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
