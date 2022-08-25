import express from "express";
import { Client, Message } from "node-osc";
import SpotifyWebApi from "spotify-web-api-node";
import nodePersist from "node-persist";
import { Server } from "http";
import dotenv from "dotenv";

let spotifyApi: SpotifyWebApi;
let server: Server | undefined;
const oscClient = new Client("localhost", 9000);
let currentSong: string;

const setupApp = async () => {
  dotenv.config();
  spotifyApi = new SpotifyWebApi({
    redirectUri: "http://localhost:8888/callback",
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  });
  process.on("SIGTERM", () => {
    if (server) server.close();
    oscClient.close();
    process.exit(0);
  });

  const storage = nodePersist.create();
  await storage.init({ dir: "data" });

  const { access_token, refresh_token } =
    (await storage.getItem("tokens")) || {};

  if (access_token && refresh_token) {
    startListening(access_token, refresh_token);
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

    const authorizationRequest = await spotifyApi.authorizationCodeGrant(
      code as string
    );

    const { access_token, refresh_token, expires_in } =
      authorizationRequest.body;

    console.log(`Tokens received. Expires in ${expires_in} seconds.`);
    res.send("OK!");

    storage.setItem("tokens", { access_token, refresh_token });

    startListening(access_token, refresh_token, expires_in);
  });

  server = app.listen(8888, () => {
    console.log(`Listening on http://localhost:8888/login for login.`);
  });
};

const startListening = async (
  access_token: string,
  refresh_token: string,
  expires_in = 3600
) => {
  spotifyApi.setAccessToken(access_token);
  spotifyApi.setRefreshToken(refresh_token);

  await refreshToken();

  setInterval(async () => await refreshToken(), (expires_in / 2) * 1000);

  setInterval(async () => {
    const playback = await spotifyApi.getMyCurrentPlaybackState();
    const { item } = playback.body as { item: SpotifyApi.TrackObjectFull };

    if (item && item.id !== currentSong) {
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
  }, 1000);
};

const refreshToken = async () => {
  const data = await spotifyApi.refreshAccessToken();
  const { access_token } = data.body;

  spotifyApi.setAccessToken(access_token);
  console.log(`Access token refreshed!`);
};

export { setupApp };
