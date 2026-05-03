import { GoogleGenAI } from "@google/genai";
import type { Content, Part } from "@google/genai";
import { isAddress } from "viem";
import { TOOLS, EXECUTORS, type ToolInput } from "./toolRegistry";
import { SYSTEM_PROMPT } from "./systemPrompt";
import type { CreateTransactionResult } from "../tools/createTransaction";
import type { BuildSwapTxResult } from "../tools/buildSwapTx";

export type ConversationMessage = Content;

export type AgentEventType =
  | "tool_start"
  | "tool_result"
  | "text"
  | "decision"
  | "swap_decision"
  | "error"
  | "done";

export interface AgentEvent {
  type: AgentEventType;
  [key: string]: unknown;
}

function extractError(err: unknown): { code: string; message: string } {
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    return {
      code: typeof e.code === "string" ? e.code : "TOOL_FAILED",
      message: typeof e.message === "string" ? e.message : JSON.stringify(err),
    };
  }
  return { code: "TOOL_FAILED", message: String(err) };
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MAX_ITERATIONS = 10;

export async function runPlanner(
  conversationHistory: ConversationMessage[],
  walletAddress: `0x${string}`,
  onEvent: (event: AgentEvent) => void
): Promise<ConversationMessage[]> {
  if (!isAddress(walletAddress)) {
    throw new Error("Invalid wallet address");
  }

  const messages: Content[] = [...conversationHistory];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages,
      config: {
        systemInstruction: SYSTEM_PROMPT(walletAddress),
        tools: TOOLS,
        maxOutputTokens: 1024,
      },
    });

    const parts: Part[] = response.candidates?.[0]?.content?.parts ?? [];

    const textContent = parts
      .filter((p) => typeof p.text === "string" && p.text)
      .map((p) => p.text as string)
      .join("");
    if (textContent) onEvent({ type: "text", content: textContent });

    messages.push({ role: "model", parts });

    const funcCallParts = parts.filter(
      (p): p is Part & { functionCall: NonNullable<Part["functionCall"]> } =>
        p.functionCall != null
    );

    if (funcCallParts.length === 0) break;

    const settled = await Promise.allSettled(
      funcCallParts.map(async (part) => {
        const name = part.functionCall.name ?? "";
        const args = (part.functionCall.args ?? {}) as ToolInput;

        const FROM_TOOLS = new Set(["selectChain", "estimateGas", "createTransaction", "getSwapQuote", "buildSwapTx"]);
        const boundArgs = FROM_TOOLS.has(name) ? { ...args, from: walletAddress } : args;

        onEvent({ type: "tool_start", tool: name, input: boundArgs });
        const executor = EXECUTORS[name];
        if (!executor) {
          throw Object.assign(
            new Error(`Unknown tool: "${name}". Valid: ${Object.keys(EXECUTORS).join(", ")}`),
            { code: "UNKNOWN_TOOL" }
          );
        }
        const result = await executor(boundArgs);
        onEvent({ type: "tool_result", tool: name, result });

        if (name === "createTransaction") {
          const tx = result as CreateTransactionResult;
          onEvent({
            type: "decision",
            recipient: args.to as string,
            chain: args.chain as string,
            targetToken: tx.targetToken,
            amountUSDT: args.amountUSDT as number | undefined,
            amountETH: args.amountETH as number | undefined,
            gasFeeNative: tx.gasEstimate.totalFeeNative,
            transaction: tx.tx,
          });
        }

        if (name === "buildSwapTx") {
          const swap = result as BuildSwapTxResult;
          onEvent({
            type: "swap_decision",
            direction: swap.direction,
            chain: args.chain as string,
            transferTo: args.transferTo as string,
            transferAmount: args.transferAmount as number,
            txCount: swap.txCount,
            approveTx: swap.approveTx,
            swapTx: swap.swapTx,
            transferTx: swap.transferTx,
          });
        }

        return { name, result };
      })
    );

    const responseParts: Part[] = settled.map((outcome, idx) => {
      const name = funcCallParts[idx].functionCall.name ?? "";
      if (outcome.status === "fulfilled") {
        return {
          functionResponse: { name, response: { result: outcome.value.result } },
        };
      }
      const { code, message } = extractError(outcome.reason);
      onEvent({ type: "error", tool: name, code, message });
      return {
        functionResponse: { name, response: { error: message, code } },
      };
    });

    messages.push({ role: "user", parts: responseParts });
  }

  onEvent({ type: "done" });
  return messages;
}
