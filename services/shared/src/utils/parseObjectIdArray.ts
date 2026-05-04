import mongoose from "mongoose";

const HEX24 = /^[a-fA-F0-9]{24}$/;

function oneHexId(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    return HEX24.test(s) ? s : null;
  }
  if (raw instanceof mongoose.Types.ObjectId) {
    const s = raw.toHexString();
    return HEX24.test(s) ? s : null;
  }
  if (typeof raw === "object" && "_id" in (raw as object)) {
    const s = String((raw as { _id: unknown })._id).trim();
    return HEX24.test(s) ? s : null;
  }
  const s = String(raw).trim();
  if (!s || s === "undefined" || s === "[object Object]") return null;
  return HEX24.test(s) ? s : null;
}

/**
 * Coerce a mixed array (strings, ObjectIds, lean `{ _id }`) into unique valid ObjectIds.
 * Drops invalid entries (e.g. `"undefined"` from bad client payloads).
 */
export function parseObjectIdArray(raw: unknown): mongoose.Types.ObjectId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: mongoose.Types.ObjectId[] = [];
  for (const item of raw) {
    const s = oneHexId(item);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(new mongoose.Types.ObjectId(s));
  }
  return out;
}
