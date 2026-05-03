import { Router } from "express";
import { isAddress } from "viem";
import { runPlanner } from "../agent/planner";
import { getSession, setSession } from "../agent/sessions";

const router = Router();
const PLANNER_TIMEOUT_MS = 120_000;

// SSE route — error middleware cannot set headers after stream opens,
// so validation errors are returned as JSON before the stream starts.
router.post("/", async (req, res) => {
  const { message, walletAddress } = req.body as {
    message?: string;
    walletAddress?: string;
  };
  if (typeof message !== "string" || !message.trim())
    return void res.status(400).json({ error: "Invalid message" });
  if (typeof walletAddress !== "string" || !isAddress(walletAddress))
    return void res.status(400).json({ error: "Invalid walletAddress" });

  const session = getSession(walletAddress);
  session.lastAccess = Date.now();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const keepalive = setInterval(() => res.write(": keepalive\n\n"), 15000);

  try {
    const initialMessages = [
      ...session.messages,
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out after 2 minutes")), PLANNER_TIMEOUT_MS)
    );

    const updatedMessages = await Promise.race([
      runPlanner(initialMessages, walletAddress as `0x${string}`, (event) => send(event.type, event)),
      timeout,
    ]);

    session.messages = updatedMessages;
    setSession(walletAddress, session);
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

export default router;
