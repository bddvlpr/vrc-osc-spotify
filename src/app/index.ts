import express from "express";
import { Client, Message } from "node-osc";
import SpotifyWebApi from "spotify-web-api-node";
import nodePersist from "node-persist";
import { Server } from "http";
import dotenv from "dotenv";
import { queueLyrics } from "./mxm";

let server: Server | undefined;
const oscClient = new Client(
  process.env.OSC_TARGET_ADDRESS || "localhost",
  Number(process.env.OSC_TARGET_PORT) || 9000
);
const storage = nodePersist.create();

const setupApp = async () => {
  dotenv.config();
  const spotifyApi = new SpotifyWebApi({
    redirectUri: "http://localhost:8888/callback",
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
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

    console.log(`Tokens received. Expires in ${expires_in} seconds.`);
    res.send("OK!");

    storage.setItem("tokens", { access_token, refresh_token });

    startListening(spotifyApi, access_token, refresh_token, expires_in);
  });

  server = app.listen(8888, () => {
    console.log(`Listening on http://localhost:8888/login for login.`);
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
        currentLyrics.forEach((lyricTimer) => clearTimeout(lyricTimer));
        currentLyrics = [];
        currentSong = undefined;
        return;
      }

      if (item && item.id !== currentSong) {
        if (process.env.MXM_ENABLED === "true" && progress_ms) {
          currentLyrics.forEach((lyricTimer) => clearTimeout(lyricTimer));
          currentLyrics = await queueLyrics(progress_ms, item, oscClient);
        }
        currentSong = item.id;
        console.log(`Now playing: ${item.name}`);
        oscClient.send(
          new Message(
            "/chatbox/input",
            `Listening to ${item.name} by ${item.artists[0].name}`,
            true,
            false
          )
        );
      }
    } catch (err) {
      console.log(`Failed fetching song. ${err}`);
    }
  }, 1000);
};

const refreshToken = async (spotifyApi: SpotifyWebApi) => {
  try {
    const { access_token, expires_in } = (await spotifyApi.refreshAccessToken())
      .body;

    spotifyApi.setAccessToken(access_token);
    console.log(`Access token refreshed! Expires in ${expires_in} seconds.`);
  } catch (err) {
    console.log(`Failed refreshing token. ${err}`);
  }
};

export { setupApp, storage };
