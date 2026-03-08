import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    workspaceId?: string;
  };
}

export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token;

  // 1. Check Cookies (Primary method for Browser requests)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Header (Fallback for non-browser/API tools)
  else if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    // This is the error you were seeing!
    res.status(401).json({ message: "Not authorized, no token found" });
    return;
  }

  try {
    // Verify token using the shared JWT_SECRET
    // We perform "Stateless" validation here.
    // If the signature is valid and not expired, we trust it.
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// Middleware to restrict access to specific roles
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
