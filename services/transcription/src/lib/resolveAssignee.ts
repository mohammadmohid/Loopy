import mongoose from "mongoose";
import { User } from "@loopy/shared";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Match a free-text name hint to one of the candidate users (host + participants).
 */
export async function resolveUserIdFromNameHint(
  hint: string,
  candidateIds: mongoose.Types.ObjectId[]
): Promise<string | null> {
  const hRaw = hint.trim();
  if (!hRaw || candidateIds.length === 0) return null;

  const uniq = [...new Set(candidateIds.map((id) => String(id)))];
  const oids = uniq.map((id) => new mongoose.Types.ObjectId(id));

  const users = await User.find({ _id: { $in: oids } })
    .select("profile.firstName profile.lastName email")
    .lean();

  const h = norm(hRaw);
  const hParts = h.split(/\s+/).filter(Boolean);

  let best: { id: string; score: number } | null = null;

  for (const u of users) {
    const rec = u as {
      _id: mongoose.Types.ObjectId;
      profile?: { firstName?: string; lastName?: string };
      email?: string;
    };
    const fn = norm(rec.profile?.firstName ?? "");
    const ln = norm(rec.profile?.lastName ?? "");
    const full = `${fn} ${ln}`.trim();
    const emailLocal = norm((rec.email ?? "").split("@")[0] ?? "");

    let score = 0;
    if (full && full === h) score = 100;
    else if (full && (full.includes(h) || h.includes(full))) score = 85;
    else if (fn && hParts.some((p) => p === fn || fn.startsWith(p))) score = 72;
    else if (ln && hParts.some((p) => p === ln)) score = 68;
    else if (emailLocal && (emailLocal === h || emailLocal.includes(h))) score = 60;
    else if (fn && h.startsWith(fn)) score = 55;

    if (score > (best?.score ?? 0)) {
      best = { id: String(rec._id), score };
    }
  }

  return best && best.score >= 50 ? best.id : null;
}
