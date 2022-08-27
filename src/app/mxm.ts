import axios from "axios";
import { Client, Message } from "node-osc";

interface Subtitle {
  text: string;
  time: {
    total: number;
    minutes: number;
    seconds: number;
    hundredths: number;
  };
}

const getLyrics = async (song: SpotifyApi.TrackObjectFull) => {
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
        usertoken: process.env.MXM_USER_TOKEN,
        signature: process.env.MXM_SIGNATURE,
        signature_protocol: "sha1",
        app_id: "web-desktop-app-v1.0",
      },
      headers: {
        Cookie: process.env.MXM_COOKIE || "",
      },
    }
  );
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
        oscClient.send(new Message("/chatbox/input", lyric.text, true, false));
      }, lyricTime - playbackProgress)
    );
  });

  console.log(`Queued ${retrievedLyrics.length} lyrics.`);
  return queuedLyrics;
};

export { getLyrics, queueLyrics };
