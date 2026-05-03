import { Request, Response, NextFunction } from "express";

/** Matches docker-compose default and meeting-service dev fallback so local stacks work without extra env. */
const DEV_INTERNAL_NOTIFICATION_SECRET = "dev-notification-secret";

export function internalNotificationSecret(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expected =
    process.env.INTERNAL_NOTIFICATION_SECRET?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : DEV_INTERNAL_NOTIFICATION_SECRET);
  if (!expected) {
    res.status(503).json({ message: "Notifications internal hook not configured" });
    return;
  }
  const got = String(req.headers["x-loopy-notification-secret"] ?? "").trim();
  if (got !== expected) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  next();
}
