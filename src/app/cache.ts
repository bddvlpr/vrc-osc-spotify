import config from "./config";
import { log } from "./logger";
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
  if (config.CACHE_DELETION && expires < Date.now()) return undefined;
  log(
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
  const expires = Date.now() + config.CACHE_EXPIRATION;
  await storage.setItem(song.id, { subtitles, expires });
};

export { loadSubtitles, saveSubtitles };
