import { useCallback, useMemo, useState } from "react";
import { BACKEND_URL } from "../web3/constants";

export type AgentStepStatus = "running" | "done" | "error";

export interface AgentStep {
  id: string;
  tool: string;
  title: string;
  detail: string;
  status: AgentStepStatus;
}

export interface AgentDecision {
  recipient: `0x${string}`;
  chain: string;
  amountUSDT: number;
  gasFeeNative: string;
  transaction: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: "0";
  };
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
      return `Total USDT: ${r.totalUSDT}`;
    case "selectChain":
      return `Selected ${(r as Record<string, unknown>).selectedChain}`;
    case "estimateGas":
      return `Gas: ${(r as Record<string, unknown>).totalFeeNative} ETH`;
    case "createTransaction":
      return "Transaction ready";
    default:
      return "Done";
  }
}

let stepCounter = 0;

export function useAgentStream() {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [claudeText, setClaudeText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [decision, setDecision] = useState<AgentDecision | null>(null);

  const reset = useCallback(() => {
    setSteps([]);
    setClaudeText("");
    setDecision(null);
    setIsStreaming(false);
  }, []);

  const clearSession = useCallback(async (walletAddress: string) => {
    await fetch(`${BACKEND_URL}/api/session/${walletAddress}`, { method: "DELETE" });
    reset();
  }, [reset]);

  const startLiveStream = useCallback(async (message: string, walletAddress: string) => {
    setIsStreaming(true);
    setSteps([]);
    setClaudeText("");
    setDecision(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, walletAddress }),
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
            const id = `${data.tool}-${++stepCounter}`;
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
          } else if (eventName === "error") {
            const msg = typeof data.message === "string" ? data.message : "Unknown error";
            setSteps((prev) => {
              const lastRunning = [...prev].reverse().find((s) => s.status === "running");
              if (!lastRunning) return prev;
              return prev.map((s) =>
                s.id === lastRunning.id ? { ...s, status: "error", detail: msg } : s
              );
            });
          } else if (eventName === "done") {
            finished = true;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error", detail: msg } : s))
      );
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const hasSteps = useMemo(() => steps.length > 0, [steps.length]);

  return {
    steps,
    claudeText,
    decision,
    hasSteps,
    isStreaming,
    startLiveStream,
    clearSession,
    reset,
  };
}
