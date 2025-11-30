import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import TokenBlocklist from "../models/TokenBlocklist.js";

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
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

    // Even if the cookie exists and the JWT signature is valid,
    // we must ensure the user didn't explicitly log out.
    const isBlocked = await TokenBlocklist.exists({ jti: decoded.jti });

    if (isBlocked) {
      // Clear the invalid cookie if it exists
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
