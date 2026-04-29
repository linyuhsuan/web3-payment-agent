import { useCallback, useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "../web3/constants";

export type AgentStepStatus = "running" | "done" | "error";

export interface AgentStep {
  id: string;
  tool: string;
  title: string;
  detail: string;
  status: AgentStepStatus;
}

export interface UnsignedTx {
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
}

export interface AgentDecision {
  recipient: `0x${string}`;
  chain: string;
  targetToken?: "USDT" | "ETH";
  amountUSDT?: number;
  amountETH?: number;
  gasFeeNative: string;
  transaction: UnsignedTx;
}

export interface AgentSwapDecision {
  direction: "ETH_TO_USDT" | "USDT_TO_ETH";
  chain: string;
  transferTo: string;
  transferAmount: number;
  txCount: number;
  approveTx?: UnsignedTx;
  swapTx: UnsignedTx;
  transferTx: UnsignedTx;
}

const TOOL_TITLES: Record<string, string> = {
  resolveIdentity: "Resolve recipient identity",
  getBalances: "Fetch balances across chains",
  selectChain: "Select optimal chain",
  estimateGas: "Estimate gas cost",
  createTransaction: "Build transaction",
  getSwapQuote: "Get Uniswap swap quote",
  buildSwapTx: "Build swap transaction",
};

function toolDetail(tool: string, result: unknown): string {
  if (!result || typeof result !== "object") return "Done";
  const r = result as Record<string, unknown>;
  switch (tool) {
    case "resolveIdentity":
      return `→ ${r.address}`;
    case "getBalances":
      return `ETH: ${r.totalETH} | USDT: ${r.totalUSDT}`;
    case "selectChain":
      return `Selected ${(r as Record<string, unknown>).selectedChain}`;
    case "estimateGas":
      return `Gas: ${(r as Record<string, unknown>).totalFeeNative} ETH`;
    case "createTransaction":
      return "Transaction ready";
    case "getSwapQuote":
      return `${(r as Record<string, unknown>).amountIn} → ${(r as Record<string, unknown>).amountOut}`;
    case "buildSwapTx":
      return `${(r as Record<string, unknown>).txCount} txs ready`;
    default:
      return "Done";
  }
}

export function useAgentStream() {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [claudeText, setClaudeText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [decision, setDecision] = useState<AgentDecision | null>(null);
  const [swapDecision, setSwapDecision] = useState<AgentSwapDecision | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const stepCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const reset = useCallback(() => {
    setSteps([]);
    setClaudeText("");
    setDecision(null);
    setSwapDecision(null);
    setIsStreaming(false);
    setStreamError(null);
  }, []);

  const clearSession = useCallback(async (walletAddress: string) => {
    await fetch(`${BACKEND_URL}/api/session/${walletAddress}`, { method: "DELETE" });
    reset();
  }, [reset]);

  const startLiveStream = useCallback(async (message: string, walletAddress: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setSteps([]);
    setClaudeText("");
    setDecision(null);
    setSwapDecision(null);
    setStreamError(null);

    // Track running steps locally to avoid reading React state in updaters
    let runningCount = 0;

    try {
      const response = await fetch(`${BACKEND_URL}/api/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, walletAddress }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        throw new Error(`SSE request failed: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const eventMatch = chunk.match(/^event:\s*(.+)$/m);
          const dataMatch = chunk.match(/^data:\s*(.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const eventName = eventMatch[1].trim();
          const data = JSON.parse(dataMatch[1]) as Record<string, unknown>;

          if (eventName === "tool_start" && typeof data.tool === "string") {
            runningCount++;
            const id = `${data.tool}-${++stepCounterRef.current}`;
            setSteps((prev) => [
              ...prev,
              {
                id,
                tool: data.tool as string,
                title: TOOL_TITLES[data.tool as string] ?? (data.tool as string),
                detail: "Running…",
                status: "running",
              },
            ]);
          } else if (eventName === "tool_result" && typeof data.tool === "string") {
            runningCount = Math.max(0, runningCount - 1);
            setSteps((prev) => {
              const lastRunningIdx = [...prev]
                .reverse()
                .findIndex((s) => s.tool === data.tool && s.status === "running");
              if (lastRunningIdx === -1) return prev;
              const realIdx = prev.length - 1 - lastRunningIdx;
              return prev.map((s, i) =>
                i === realIdx
                  ? { ...s, status: "done", detail: toolDetail(data.tool as string, data.result) }
                  : s
              );
            });
          } else if (eventName === "text" && typeof data.content === "string") {
            setClaudeText((prev) => prev + data.content);
          } else if (eventName === "decision") {
            setDecision(data as unknown as AgentDecision);
          } else if (eventName === "swap_decision") {
            setSwapDecision(data as unknown as AgentSwapDecision);
          } else if (eventName === "error") {
            const msg = typeof data.message === "string" ? data.message : "Unknown error";
            if (runningCount === 0) {
              setStreamError(msg);
            } else {
              runningCount = Math.max(0, runningCount - 1);
              setSteps((prev) => {
                const lastRunning = [...prev].reverse().find((s) => s.status === "running");
                if (!lastRunning) return prev;
                return prev.map((s) =>
                  s.id === lastRunning.id ? { ...s, status: "error", detail: msg } : s
                );
              });
            }
          } else if (eventName === "done") {
            finished = true;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (runningCount === 0) {
        setStreamError(msg);
      } else {
        setSteps((prev) =>
          prev.map((s) => (s.status === "running" ? { ...s, status: "error", detail: msg } : s))
        );
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const hasSteps = steps.length > 0;

  return {
    steps,
    claudeText,
    decision,
    swapDecision,
    hasSteps,
    isStreaming,
    streamError,
    startLiveStream,
    clearSession,
    reset,
  };
}
