import "dotenv/config";
import express from "express";
import cors from "cors";
import { isAddress } from "viem";
import { getBalances } from "./tools/getBalances";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/balances", async (req, res) => {
  const { address } = req.query;
  if (typeof address !== "string" || !isAddress(address)) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }
  try {
    const result = await getBalances(address as `0x${string}`);
    res.json(result);
  } catch (err) {
    console.error("[/api/balances]", err);
    res.status(500).json({ error: "Failed to fetch balances" });
  }
});

// POST /api/agent — SSE endpoint (implemented Day 3)
app.post("/api/agent", (_req, res) => {
  res.status(501).json({ error: "Not implemented yet — coming Day 3" });
});

app.listen(PORT, () => {
  console.log(`[backend] Server running at http://localhost:${PORT}`);
});
