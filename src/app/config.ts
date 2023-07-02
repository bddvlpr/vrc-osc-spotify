import dotenv from "dotenv";
import { z } from "zod";

const setupConfiguration = () => {
  dotenv.config();
  const envSchema = z.object({
    CLIENT_ID: z.string().min(1),
    CLIENT_SECRET: z.string().min(1),

    MXM_USER_TOKEN: z.string().optional(),
    MXM_SIGNATURE: z.string().optional(),
    MXM_COOKIE: z.string().optional(),

    LYRIX_SERVER: z.string().default("https://lyrix.vercel.app"),

    OSC_TARGET_ADDRESS: z.string().optional().default("localhost"),
    OSC_TARGET_PORT: z.number().optional().default(9000),

    CACHE_DELETION: z
      .string()
      .optional()
      .default("true")
      .transform((s) => s === "true"),
    CACHE_EXPIRATION: z
      .string()
      .optional()
      .default("604800000")
      .transform((s) => parseInt(s, 10)),

    LISTENING_SONG_PARAMETER: z.string().optional(),

    DISCORD_TOKEN: z.string().optional(),
  });

  return envSchema.parse(process.env);
};

export default setupConfiguration();
