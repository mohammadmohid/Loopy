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

  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

      // CHECK MONGODB BLOCKLIST
      // If the token ID exists in the blocklist, reject the request
      const isBlocked = await TokenBlocklist.exists({ jti: decoded.jti });
      if (isBlocked) {
        res.status(401).json({ message: "Session expired (Logged out)." });
        return;
      }

      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, invalid token" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};
