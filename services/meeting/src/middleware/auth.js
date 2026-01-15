import jwt from "jsonwebtoken";

export const protect = async (req, res, next) => {
  let token;

  // 1. Check for token in Cookies (This fixes the Frontend issue)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check for token in Authorization Header (This keeps Postman working)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user info to request
      req.user = decoded; 
      
      next();
    } catch (error) {
      console.error("Token verification failed:", error.message);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    // No token found in either place
    res.status(401).json({ message: "Not authorized, no token" });
  }
};