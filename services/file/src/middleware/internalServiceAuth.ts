import { Request, Response, NextFunction } from "express";

/**
 * Middleware to allow internal service-to-service calls
 * Can be used to create synthetic req.user object for internal requests
 */
export const allowInternalServiceCalls = (req: Request, res: Response, next: NextFunction) => {
  const isInternalCall = req.headers["x-internal-call"] === "true";
  const internalServiceKey = req.headers["x-service-key"];
  const expectedServiceKey = process.env.INTERNAL_SERVICE_KEY || "loopy-internal-secret-2024";

  // Check if it's marked as internal call or has a valid service key
  if (isInternalCall || (internalServiceKey && internalServiceKey === expectedServiceKey)) {
    // For internal calls, extract workspace ID from header
    const workspaceId = req.headers["x-workspace-id"] as string;
    
    // We treat this as a system-level request
    (req as any).user = {
      id: "system",
      role: "ADMIN",
      workspaceId: workspaceId || null,
    };
    return next();
  }

  // Not an internal call, continue to regular auth
  next();
};
