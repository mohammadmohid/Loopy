/**
 * Chat listen port: CHAT_PORT only, then default 5004.
 * We intentionally do not read generic `PORT` — it is often shared with transcription
 * or injected from a monorepo root `.env` and causes EADDRINUSE on 5005.
 */
export function getChatListenPort(): number {
  const raw = process.env.CHAT_PORT;
  if (raw != null && String(raw).trim() !== "") {
    const n = Number(String(raw).replace(/^["']|["']$/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 5004;
}
