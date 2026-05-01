import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

/** `src/` → service root `.env` */
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");

// `override: true` so a cwd/root `.env` or another module’s `dotenv.config()` cannot pin PORT=5005 for chat.
const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  console.warn(`[chat] Could not load ${envPath}:`, result.error.message);
} else {
  console.log(`[chat] Loaded env from ${envPath}`);
}
