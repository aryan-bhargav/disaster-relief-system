import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import authRoutes from "./routes/auth.routes.js";
import centreRoutes from "./routes/centre.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import requestRoutes from "./routes/request.routes.js";
import allocationRoutes from "./routes/allocation.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

const isDev = process.env.NODE_ENV !== "production";
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Exact matches against allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Match any localhost or 127.0.0.1 port (e.g. http://localhost:3000, http://127.0.0.1:3001)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // In development mode or if CORS_ORIGIN is '*', allow any origin
    if (isDev || process.env.CORS_ORIGIN === "*") {
      return callback(null, true);
    }

    // Otherwise, deny
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  exposedHeaders: ["Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/centres", centreRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Disaster Relief API is running",
  });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Central Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  const message = err instanceof Error ? err.message : "Internal Server Error";
  res.status(500).json({
    success: false,
    message,
  });
});

export default app;
