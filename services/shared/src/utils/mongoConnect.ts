import mongoose from "mongoose";
import { configureMongoDns } from "./configureMongoDns.js";

export type ConnectMongoOptions = {
  label?: string;
  maxAttempts?: number;
  baseDelayMs?: number;
};

function isDnsSrvFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ESERVFAIL|querySrv|queryTxt|ENOTFOUND|EAI_AGAIN/i.test(msg);
}

/**
 * Connect with DNS tweaks + IPv4-first + retries.
 *
 * **Optional:** set `MONGO_URI_STANDARD` to Atlas’s *standard* (`mongodb://…`) URI
 * (not `mongodb+srv`) if SRV/TXT DNS keeps failing — no need to change `MONGO_URI` elsewhere.
 */
export async function connectMongoWithRetry(
  uri: string | undefined,
  options: ConnectMongoOptions = {}
): Promise<void> {
  configureMongoDns();

  const fromEnv = (process.env.MONGO_URI_STANDARD || "").trim();
  const trimmed = fromEnv || (uri || "").trim();
  if (!trimmed) {
    throw new Error("MONGO_URI is not defined");
  }

  const label = options.label ?? "MongoDB";
  const maxAttempts = options.maxAttempts ?? 6;
  const baseDelayMs = options.baseDelayMs ?? 1500;

  const driverOpts = {
    family: 4 as const,
    serverSelectionTimeoutMS: 20_000,
  };

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (mongoose.connection.readyState === 1) {
        console.log(`[${label}] MongoDB already connected`);
        return;
      }
      await mongoose.connect(trimmed, driverOpts);
      if (attempt > 1) {
        console.log(`[${label}] MongoDB connected (attempt ${attempt}/${maxAttempts})`);
      } else {
        console.log(`[${label}] MongoDB connected`);
      }
      return;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[${label}] Mongo connect attempt ${attempt}/${maxAttempts} failed: ${msg}`);
      if (attempt === maxAttempts) break;
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 20_000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  console.error(`[${label}] All MongoDB connection attempts failed.`);
  if (isDnsSrvFailure(lastErr) && trimmed.startsWith("mongodb+srv://")) {
    console.error(
      `[${label}] DNS failed for mongodb+srv. In Atlas: Connect → Drivers → copy the **standard** connection string, ` +
        `then set MONGO_URI_STANDARD in this service's .env (mongodb://host:27017,…). Or fix system/VPN DNS.`
    );
  }
  throw lastErr;
}
