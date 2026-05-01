import "dotenv/config";
import express from "express";
import cors from "cors";
import { errorMiddleware } from "./middleware/errors";
import balancesRouter from "./routes/balances";
import agentRouter from "./routes/agent";
import sessionRouter from "./routes/session";

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/balances", balancesRouter);
app.use("/api/agent", agentRouter);
app.use("/api/session", sessionRouter);

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`[backend] Server running at http://localhost:${PORT}`);
});
