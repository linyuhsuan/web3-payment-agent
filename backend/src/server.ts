import "dotenv/config";
import express from "express";
import cors from "cors";
import { isAddress } from "viem";
import { getBalances } from "./tools/getBalances";
import { estimateGas } from "./tools/estimateGas";
import { selectChain } from "./tools/selectChain";
import { createTransaction } from "./tools/createTransaction";
import { resolveIdentity } from "./tools/resolveIdentity";
import { runPlanner, type ConversationMessage } from "./planner";
import { type SupportedChain, SUPPORTED_CHAINS } from "./web3/constants";

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

// In-memory conversation sessions keyed by walletAddress
const sessions = new Map<string, { messages: ConversationMessage[]; lastAccess: number }>();

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [key, s] of sessions) {
    if (s.lastAccess < cutoff) sessions.delete(key);
  }
}, 10 * 60 * 1000);

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

app.post("/api/tools/resolve-identity", async (req, res) => {
  const { identifier } = req.body as { identifier?: string };
  if (typeof identifier !== "string" || !identifier.trim()) {
    res.status(400).json({ error: "Invalid identifier" });
    return;
  }
  try {
    const result = await resolveIdentity(identifier);
    res.json(result);
  } catch (err) {
    console.error("[/api/tools/resolve-identity]", err);
    res.status(500).json({ error: "Failed to resolve identity" });
  }
});

app.post("/api/tools/estimate-gas", async (req, res) => {
  const { chain, from, to, amountUSDT } = req.body as {
    chain?: SupportedChain;
    from?: string;
    to?: string;
    amountUSDT?: number;
  };
  if (!chain || !SUPPORTED_CHAINS.includes(chain)) {
    res.status(400).json({ error: "Invalid chain" });
    return;
  }
  if (typeof from !== "string" || !isAddress(from)) {
    res.status(400).json({ error: "Invalid from address" });
    return;
  }
  if (typeof to !== "string" || !isAddress(to)) {
    res.status(400).json({ error: "Invalid to address" });
    return;
  }
  if (typeof amountUSDT !== "number" || amountUSDT <= 0) {
    res.status(400).json({ error: "Invalid amountUSDT" });
    return;
  }
  try {
    const result = await estimateGas({
      chain,
      from: from as `0x${string}`,
      to: to as `0x${string}`,
      amountUSDT,
    });
    res.json(result);
  } catch (err) {
    console.error("[/api/tools/estimate-gas]", err);
    res.status(500).json({ error: "Failed to estimate gas" });
  }
});

app.post("/api/tools/select-chain", async (req, res) => {
  const { address, to, amountUSDT } = req.body as {
    address?: string;
    to?: string;
    amountUSDT?: number;
  };
  if (typeof address !== "string" || !isAddress(address)) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }
  if (typeof to !== "string" || !isAddress(to)) {
    res.status(400).json({ error: "Invalid to address" });
    return;
  }
  if (typeof amountUSDT !== "number" || amountUSDT <= 0) {
    res.status(400).json({ error: "Invalid amountUSDT" });
    return;
  }
  try {
    const balances = await getBalances(address as `0x${string}`);
    const result = await selectChain({
      from: address as `0x${string}`,
      to: to as `0x${string}`,
      amountUSDT,
      balances,
    });
    res.json(result);
  } catch (err) {
    console.error("[/api/tools/select-chain]", err);
    res.status(500).json({ error: "Failed to select chain" });
  }
});

app.post("/api/tools/create-transaction", async (req, res) => {
  const { from, to, amountUSDT, chain } = req.body as {
    from?: string;
    to?: string;
    amountUSDT?: number;
    chain?: SupportedChain;
  };
  if (typeof from !== "string" || !isAddress(from)) {
    res.status(400).json({ error: "Invalid from address" });
    return;
  }
  if (typeof to !== "string" || !isAddress(to)) {
    res.status(400).json({ error: "Invalid to address" });
    return;
  }
  if (typeof amountUSDT !== "number" || amountUSDT <= 0) {
    res.status(400).json({ error: "Invalid amountUSDT" });
    return;
  }
  if (!chain || !SUPPORTED_CHAINS.includes(chain)) {
    res.status(400).json({ error: "Invalid chain" });
    return;
  }
  try {
    const result = await createTransaction({
      from: from as `0x${string}`,
      to: to as `0x${string}`,
      amountUSDT,
      chain,
    });
    res.json(result);
  } catch (err) {
    console.error("[/api/tools/create-transaction]", err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

app.post("/api/agent", async (req, res) => {
  const { message, walletAddress } = req.body as {
    message?: string;
    walletAddress?: string;
  };
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "Invalid message" });
    return;
  }
  if (typeof walletAddress !== "string" || !isAddress(walletAddress)) {
    res.status(400).json({ error: "Invalid walletAddress" });
    return;
  }

  const session = sessions.get(walletAddress) ?? { messages: [], lastAccess: 0 };
  session.lastAccess = Date.now();
  session.messages.push({ role: "user", parts: [{ text: message }] });
  sessions.set(walletAddress, session);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const keepalive = setInterval(() => res.write(": keepalive\n\n"), 15000);

  try {
    const updatedMessages = await runPlanner(
      session.messages,
      walletAddress as `0x${string}`,
      (event) => send(event.type, event)
    );
    session.messages = updatedMessages;
  } catch (err) {
    console.error("[/api/agent]", err);
    send("error", {
      type: "error",
      code: "PLANNER_FAILED",
      message: err instanceof Error ? err.message : "Unknown planner error",
    });
  } finally {
    clearInterval(keepalive);
    res.end();
  }
});

app.delete("/api/session/:walletAddress", (req, res) => {
  sessions.delete(req.params.walletAddress);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[backend] Server running at http://localhost:${PORT}`);
});
