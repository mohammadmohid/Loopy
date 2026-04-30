import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export type AuthRequest = Request;

import TokenBlocklist from "../models/TokenBlocklist.js";

// Stateless token validation that inherently checks the blocklist.
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    // 1. Check Cookies
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fallback for non-browser APIs
    else if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({ message: "Not authorized, no token" });
      return;
    }

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

      const isBlocked = await TokenBlocklist.exists({ jti: decoded.jti });
      if (isBlocked) {
        res.clearCookie("token");
        res.status(401).json({ message: "Session expired (Logged out)." });
        return;
      }

      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, invalid token" });
    }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        message: `User role ${req.user?.role} is not authorized to access this route`,
      });
      return;
    }
    next();
  };
};
