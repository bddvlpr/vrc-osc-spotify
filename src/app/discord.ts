import axios from "axios"
import config from "./config";

export const setStatus = async (status: string | null) => {
    axios.patch('https://discordapp.com/api/v8/users/@me/settings', {
        custom_status: status ? {
            text: status,
            expires_at: new Date(Date.now() + 1000 * 10).toISOString(),
        } : null
    }, {
        headers: {
            "Content-Type": "application/json",
            'Authorization': `${config.DISCORD_TOKEN}`,
        }
    });
}