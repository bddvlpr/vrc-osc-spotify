import axios from "axios";
import { Client, Message } from "node-osc";
import { loadSubtitles, saveSubtitles } from "../cache";
import config from "../config";
import { log } from "../logger";
import { LyrixSubtitle, Subtitle } from "./types";
import { setStatus } from "../discord";

const pullLyrics = async (song: SpotifyApi.TrackObjectFull) => {
  const response = await axios.get(
    `${config.LYRIX_SERVER}/getLyrics/${song.id}`,
    { validateStatus: () => true }
  );

  const { status } = response;
  if (status != 200) {
    log(`Error: Could not retrieve lyrics: ${status}.`);
    return undefined;
  }

  const lines = response.data.lyrics?.lines as LyrixSubtitle[] | undefined;

  if (!lines) return undefined;

  return lines.map(
    (line) =>
      ({
        text: line.words,
        time: {
          total: +line.startTimeMs / 1000,
        },
      } as Subtitle)
  );
};

const queueLyrix = async (
  playbackProgress: number,
  song: SpotifyApi.TrackObjectFull,
  oscClient: Client
) => {
  const queuedLyrics: NodeJS.Timeout[] = [];
  const retrievedLyrics = await getLyrics(song);

  if (!retrievedLyrics) return [];

  retrievedLyrics.forEach((lyric) => {
    const lyricTime = lyric.time.total * 1000;
    if (lyricTime <= playbackProgress) return [];

    queuedLyrics.push(
      setTimeout(() => {
        log(`>> ${lyric.text}`, false);
        oscClient.send(
          new Message(
            "/chatbox/input",
            lyric.text ? `(♪) ${lyric.text}` : "",
            true,
            false
          )
        );
        setStatus(lyric.text);
      }, lyricTime - playbackProgress)
    );
  });

  log(`Queued ${retrievedLyrics.length} lyrics.`);
  return queuedLyrics;
};

const getLyrics = async (song: SpotifyApi.TrackObjectFull) => {
  let retrievedLyrics = await loadSubtitles(song);

  if (!retrievedLyrics) {
    log(`No local lyrics found for ${song.name}. Pulling from lyrix...`);
    retrievedLyrics = (await pullLyrics(song)) || [];
    await saveSubtitles(song, retrievedLyrics);
  }
  return retrievedLyrics;
};

export { pullLyrics, queueLyrix };
