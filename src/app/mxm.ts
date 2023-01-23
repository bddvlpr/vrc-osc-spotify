import axios from "axios";
import { Client, Message } from "node-osc";
import { loadSubtitles, saveSubtitles } from "./cache";
import config from "./config";
import { log } from "./logger";

interface Subtitle {
  text: string;
  time: {
    total: number;
    minutes: number;
    seconds: number;
    hundredths: number;
  };
}

const pullLyrics = async (song: SpotifyApi.TrackObjectFull) => {
  const response = await axios.get(
    "https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get",
    {
      params: {
        format: "json",
        q_track: song.name,
        q_artist: song.artists[0],
        q_artists: song.artists.join(","),
        q_album: song.album.name,
        user_language: "en",
        q_duration: song.duration_ms / 1000,
        tags: "nowplaying",
        namespace: "lyrics_synched",
        part: "lyrics_crowd,user,lyrics_verified_by",
        track_spotify_id: song.uri,
        f_subtitle_length_max_deviation: "1",
        subtitle_format: "mxm",
        usertoken: config.MXM_USER_TOKEN,
        signature: config.MXM_SIGNATURE,
        signature_protocol: "sha1",
        app_id: "web-desktop-app-v1.0",
      },
      headers: {
        Cookie: config.MXM_COOKIE || "",
      },
    }
  );

  const { status_code, hint } = response.data.message.header;

  if (status_code !== 200) {
    log(
      `Error: Could not retrieve lyrics: ${status_code} ${
        hint.includes("captcha")
          ? "Captcha requested. Make sure you're using a token that isn't duplicated or spamming the endpoint."
          : hint
      }.`
    );
    return undefined;
  }

  const { macro_calls } = response.data.message.body;
  const userBlobResponse =
    macro_calls["userblob.get"].message.header.status_code;
  const trackGetResponse =
    macro_calls["track.subtitles.get"].message.header.status_code;

  switch (200) {
    case userBlobResponse:
      return macro_calls["userblob.get"].message.body.subtitles as Subtitle[];
    case trackGetResponse:
      return JSON.parse(
        macro_calls["track.subtitles.get"].message.body.subtitle_list[0]
          .subtitle.subtitle_body
      ) as Subtitle[];
    default:
      return undefined;
  }
};

const queueLyrics = async (
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
        //console.log(`>> ${lyric.text}`);
        oscClient.send(
          new Message(
            "/chatbox/input",
            lyric.text ? `(♪) ${lyric.text}` : "",
            true,
            false
          )
        );
      }, lyricTime - playbackProgress)
    );
  });

  log(`Queued ${retrievedLyrics.length} lyrics.`);
  return queuedLyrics;
};

const getLyrics = async (song: SpotifyApi.TrackObjectFull) => {
  let retrievedLyrics = await loadSubtitles(song);

  if (!retrievedLyrics) {
    log(`No local lyrics found for ${song.name}. Pulling from mxm...`);
    retrievedLyrics = (await pullLyrics(song)) || [];
    await saveSubtitles(song, retrievedLyrics);
  }
  return retrievedLyrics;
};

export { pullLyrics, queueLyrics, getLyrics, Subtitle };
