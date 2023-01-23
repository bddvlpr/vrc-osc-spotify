import { Server } from "http";
import os from "os";
import express from "express";
import { Client, Message } from "node-osc";
import { create as createStorage } from "node-persist";
import SpotifyWebApi from "spotify-web-api-node";
import config from "./config";
import { log } from "./logger";
import { queueLyrics } from "./mxm";

let server: Server | undefined;
const oscClient = new Client(config.OSC_TARGET_ADDRESS, config.OSC_TARGET_PORT);
const storage = createStorage();

const setupApp = async () => {
  const spotifyApi = new SpotifyWebApi({
    redirectUri: "http://localhost:8888/callback",
    clientId: config.CLIENT_ID,
    clientSecret: config.CLIENT_SECRET,
  });
  process.on("SIGTERM", () => {
    if (server) server.close();
    oscClient.close();
    process.exit(0);
  });

  await storage.init({ dir: "data" });

  const { access_token, refresh_token } =
    (await storage.getItem("tokens")) || {};

  if (access_token && refresh_token) {
    startListening(spotifyApi, access_token, refresh_token);
    return;
  }
  const app = express();

  app.get("/login", (_, res) => {
    res.redirect(
      spotifyApi.createAuthorizeURL(["user-read-playback-state"], "setup")
    );
  });

  app.get("/callback", async (req, res) => {
    const { error, code } = req.query;

    if (error) {
      res.send(`Error: ${error}`);
    }

    const { access_token, refresh_token, expires_in } = (
      await spotifyApi.authorizationCodeGrant(code as string)
    ).body;

    log(`Tokens received. Expires in ${expires_in} seconds.`);
    res.send("OK!");

    storage.setItem("tokens", { access_token, refresh_token });

    startListening(spotifyApi, access_token, refresh_token, expires_in);
  });

  server = app.listen(8888, () => {
    log(`Listening on http://localhost:8888/login for login.`);
  });
};

const startListening = async (
  spotifyApi: SpotifyWebApi,
  access_token: string,
  refresh_token: string,
  expires_in = 3600
) => {
  spotifyApi.setAccessToken(access_token);
  spotifyApi.setRefreshToken(refresh_token);

  await refreshToken(spotifyApi);

  setInterval(
    async () => await refreshToken(spotifyApi),
    (expires_in / 2) * 1000
  );

  let currentSong: string | undefined;
  let currentLyrics: NodeJS.Timeout[] = [];
  setInterval(async () => {
    try {
      const { item, is_playing, progress_ms } = (
        await spotifyApi.getMyCurrentPlaybackState()
      ).body as {
        item: SpotifyApi.TrackObjectFull;
        is_playing: boolean;
        progress_ms: number;
      };

      if (!is_playing) {
        if (config.LISTENING_SONG_PARAMETER && currentSong) {
          oscClient.send(
            new Message(
              `/avatar/parameters/${config.LISTENING_SONG_PARAMETER}`,
              false
            )
          );
        }

        currentLyrics.forEach((lyricTimer) => clearTimeout(lyricTimer));
        currentLyrics = [];
        currentSong = undefined;
        return;
      }

      if (item && item.id !== currentSong) {
        log(`${os.EOL}Now playing: ${item.name}`);

        if (config.LISTENING_SONG_PARAMETER) {
          oscClient.send(
            new Message(
              `/avatar/parameters/${config.LISTENING_SONG_PARAMETER}`,
              true
            )
          );
        }

        if (
          config.MXM_USER_TOKEN &&
          config.MXM_SIGNATURE &&
          config.MXM_COOKIE &&
          progress_ms
        ) {
          currentLyrics.forEach((lyricTimer) => clearTimeout(lyricTimer));
          currentLyrics = await queueLyrics(progress_ms, item, oscClient);
        }
        currentSong = item.id;
        oscClient.send(
          new Message(
            "/chatbox/input",
            `(🎵) ${item.name} by ${item.artists[0].name}`,
            true,
            false
          )
        );
      }
    } catch (err) {
      log(`Failed fetching song. ${err}`);
    }
  }, 1000);
};

const refreshToken = async (spotifyApi: SpotifyWebApi) => {
  try {
    const { access_token, expires_in } = (await spotifyApi.refreshAccessToken())
      .body;

    spotifyApi.setAccessToken(access_token);
    log(`Access token refreshed! Expires in ${expires_in} seconds.`);
  } catch (err) {
    log(`Failed refreshing token. ${err}`);
  }
};

export { setupApp, storage };
