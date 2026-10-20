import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import centreRoutes from "./routes/centre.routes";
import resourceRoutes from "./routes/resource.routes";
import requestRoutes from "./routes/request.routes";
import allocationRoutes from "./routes/allocation.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

app.use(cors({
  origin: "http://localhost:3000"
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/centres", centreRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Disaster Relief API is running"
  });
});

export default app;