import Pusher from "pusher";

// Env is loaded in src/env.ts (imported first from index.ts). Do not call dotenv here — cwd/root PORT would leak in.

export const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID as string,
    key: process.env.PUSHER_KEY as string,
    secret: process.env.PUSHER_SECRET as string,
    cluster: process.env.PUSHER_CLUSTER as string,
    useTLS: true,
});
