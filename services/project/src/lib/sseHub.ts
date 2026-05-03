import type { Response } from "express";

const clientsByUser = new Map<string, Set<Response>>();

function bucket(userId: string): Set<Response> {
  let s = clientsByUser.get(userId);
  if (!s) {
    s = new Set();
    clientsByUser.set(userId, s);
  }
  return s;
}

export function sseSubscribe(userId: string, res: Response): void {
  bucket(userId).add(res);
}

export function sseUnsubscribe(userId: string, res: Response): void {
  const s = clientsByUser.get(userId);
  if (!s) return;
  s.delete(res);
  if (s.size === 0) clientsByUser.delete(userId);
}

export function sseEmit(userId: string, eventName: string, data: unknown): void {
  const set = clientsByUser.get(userId);
  if (!set?.size) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of [...set]) {
    try {
      res.write(payload);
    } catch {
      set.delete(res);
    }
  }
}
