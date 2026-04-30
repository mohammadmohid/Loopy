import { Request } from "express";

/**
 * Module augmentation for Express Request.
 * Ensures `req.user` and `req.params` are always visible,
 * even when compiled under Vercel's tsc environment which
 * may include the DOM lib (causing type conflicts).
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        workspaceId?: string;
        jti?: string;
        [key: string]: any;
      };
    }
  }
}

export {};
