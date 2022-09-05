import { Subtitle } from "./mxm";
import { storage } from ".";

interface SubtitleCache {
  subtitles: Subtitle[];
  expires: number;
}

const loadSubtitles = async (song: SpotifyApi.TrackObjectFull) => {
  const cached = await storage.getItem(song.id);
  if (!cached) return undefined;
  const { subtitles, expires } = cached as SubtitleCache;
  if (expires < Date.now()) return undefined;
  console.log(
    `Cached subtitles expire in ${((expires - Date.now()) / 60000).toFixed(
      2
    )} minutes.`
  );
  return subtitles;
};

const saveSubtitles = async (
  song: SpotifyApi.TrackObjectFull,
  subtitles: Subtitle[]
) => {
  if (subtitles.length === 0) return;
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 7;
  await storage.setItem(song.id, { cached: subtitles, expires });
};

export { loadSubtitles, saveSubtitles };
