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

    OSC_TARGET_ADDRESS: z.string().optional().default("localhost"),
    OSC_TARGET_PORT: z.number().optional().default(9000),
  });

  return envSchema.parse(process.env);
};

export default setupConfiguration();
