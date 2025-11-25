import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(helmet());

app.get("/", (req, res) => {
  res.send("Loopy API Gateway is running");
});

// Route: Auth Service
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/api/auth": "/api/auth",
    },
  })
);

// Route: Project Service
app.use(
  "/api/projects",
  createProxyMiddleware({
    target: process.env.PROJECT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/api/projects": "/api/projects",
    },
  })
);

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
