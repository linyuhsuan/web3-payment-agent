import { GoogleGenAI, Type } from "@google/genai";
import type { Content, Part, FunctionDeclaration, Tool } from "@google/genai";
import { isAddress } from "viem";
import { resolveIdentity } from "./tools/resolveIdentity";
import { getBalances, type GetBalancesResult } from "./tools/getBalances";
import { selectChain } from "./tools/selectChain";
import { estimateGas } from "./tools/estimateGas";
import { createTransaction, type CreateTransactionResult } from "./tools/createTransaction";
import { getSwapQuote } from "./tools/getSwapQuote";
import { buildSwapTx, type BuildSwapTxResult } from "./tools/buildSwapTx";
import { SUPPORTED_CHAINS, type SupportedChain } from "./web3/constants";
import { SYSTEM_PROMPT } from "./systemPrompt";

// Use Gemini's Content type directly so messages are compatible with generateContent
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

const CHAIN_LIST = SUPPORTED_CHAINS.join(", ");

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "resolveIdentity",
    description:
      "Resolve an ENS name (e.g. alice.eth) or a 0x address to a checksummed Ethereum address.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        identifier: {
          type: Type.STRING,
          description: "ENS name (e.g. alice.eth) or a 0x Ethereum address",
        },
      },
      required: ["identifier"],
    },
  },
  {
    name: "getBalances",
    description: `Fetch USDT and ETH balances for a wallet across all supported chains: ${CHAIN_LIST}.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        address: {
          type: Type.STRING,
          description: "The wallet address to check",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "selectChain",
    description:
      "Pick the best chain for a transfer: must have enough balance and the lowest total gas cost.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        from: { type: Type.STRING, description: "Sender wallet address" },
        to: { type: Type.STRING, description: "Recipient wallet address (resolved 0x address)" },
        targetToken: { type: Type.STRING, description: "Token to transfer: 'USDT' or 'ETH'" },
        amountUSDT: { type: Type.NUMBER, description: "Amount of USDT to transfer (if targetToken is USDT)" },
        amountETH: { type: Type.NUMBER, description: "Amount of ETH to transfer (if targetToken is ETH)" },
        balances: { type: Type.OBJECT, description: "The full result object returned by getBalances" },
      },
      required: ["from", "to", "balances"],
    },
  },
  {
    name: "estimateGas",
    description:
      "Estimate the total gas cost (including L1 data fee for L2 chains) for a token transfer on a specific chain.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        chain: { type: Type.STRING, description: `One of: ${CHAIN_LIST}` },
        from: { type: Type.STRING, description: "Sender address" },
        to: { type: Type.STRING, description: "Recipient address" },
        targetToken: { type: Type.STRING, description: "Token to transfer: 'USDT' or 'ETH'" },
        amountUSDT: { type: Type.NUMBER, description: "Amount of USDT (if targetToken is USDT)" },
        amountETH: { type: Type.NUMBER, description: "Amount of ETH (if targetToken is ETH)" },
      },
      required: ["chain", "from", "to"],
    },
  },
  {
    name: "createTransaction",
    description:
      "Build the final unsigned transfer calldata with a final balance check. Call this last after selecting the chain. Supports both USDT ERC-20 and native ETH transfers.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        chain: { type: Type.STRING, description: `One of: ${CHAIN_LIST}` },
        from: { type: Type.STRING, description: "Sender address" },
        to: { type: Type.STRING, description: "Recipient address" },
        targetToken: { type: Type.STRING, description: "Token to transfer: 'USDT' or 'ETH'" },
        amountUSDT: { type: Type.NUMBER, description: "Amount of USDT (if targetToken is USDT)" },
        amountETH: { type: Type.NUMBER, description: "Amount of ETH (if targetToken is ETH)" },
      },
      required: ["chain", "from", "to"],
    },
  },
  {
    name: "getSwapQuote",
    description:
      "Get a swap quote from Uniswap. Use when user wants to pay a token they don't have (ETH→USDT or USDT→ETH). Returns a quoteId for use with buildSwapTx.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        direction: { type: Type.STRING, description: "'ETH_TO_USDT' or 'USDT_TO_ETH'" },
        chain: { type: Type.STRING, description: `One of: ${CHAIN_LIST}` },
        from: { type: Type.STRING, description: "Sender address" },
        to: { type: Type.STRING, description: "Final recipient address" },
        amountOut: { type: Type.NUMBER, description: "How much output token the user wants (EXACT_OUTPUT)" },
      },
      required: ["direction", "chain", "from", "to", "amountOut"],
    },
  },
  {
    name: "buildSwapTx",
    description:
      "Build the unsigned swap + transfer transactions using a Uniswap quote. Call after getSwapQuote. Returns 2 txs (ETH→USDT) or 3 txs (USDT→ETH: approve + swap + transfer).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        quoteId: { type: Type.STRING, description: "quoteId returned by getSwapQuote" },
        chain: { type: Type.STRING, description: `One of: ${CHAIN_LIST}` },
        from: { type: Type.STRING, description: "Sender address" },
        transferTo: { type: Type.STRING, description: "Final recipient address" },
        transferAmount: { type: Type.NUMBER, description: "Amount of output token to transfer to recipient" },
        direction: { type: Type.STRING, description: "'ETH_TO_USDT' or 'USDT_TO_ETH'" },
      },
      required: ["quoteId", "chain", "from", "transferTo", "transferAmount", "direction"],
    },
  },
];

const TOOLS: Tool[] = [{ functionDeclarations: TOOL_DECLARATIONS }];

type ToolInput = Record<string, unknown>;

const EXECUTORS: Record<string, (input: ToolInput) => Promise<unknown>> = {
  resolveIdentity: (input) => resolveIdentity(input.identifier as string),
  getBalances: (input) => getBalances(input.address as `0x${string}`),
  selectChain: (input) =>
    selectChain({
      from: input.from as `0x${string}`,
      to: input.to as `0x${string}`,
      targetToken: (input.targetToken as "USDT" | "ETH") ?? "USDT",
      amountUSDT: input.amountUSDT as number | undefined,
      amountETH: input.amountETH as number | undefined,
      balances: input.balances as GetBalancesResult,
    }),
  estimateGas: (input) =>
    estimateGas({
      chain: input.chain as SupportedChain,
      from: input.from as `0x${string}`,
      to: input.to as `0x${string}`,
      targetToken: (input.targetToken as "USDT" | "ETH") ?? "USDT",
      amountUSDT: input.amountUSDT as number | undefined,
      amountETH: input.amountETH as number | undefined,
    }),
  createTransaction: (input) =>
    createTransaction({
      chain: input.chain as SupportedChain,
      from: input.from as `0x${string}`,
      to: input.to as `0x${string}`,
      targetToken: (input.targetToken as "USDT" | "ETH") ?? "USDT",
      amountUSDT: input.amountUSDT as number | undefined,
      amountETH: input.amountETH as number | undefined,
    }),
  getSwapQuote: (input) =>
    getSwapQuote({
      direction: input.direction as "ETH_TO_USDT" | "USDT_TO_ETH",
      chain: input.chain as SupportedChain,
      from: input.from as `0x${string}`,
      to: input.to as `0x${string}`,
      amountOut: input.amountOut as number,
    }),
  buildSwapTx: (input) =>
    buildSwapTx({
      quoteId: input.quoteId as string,
      chain: input.chain as SupportedChain,
      from: input.from as `0x${string}`,
      transferTo: input.transferTo as `0x${string}`,
      transferAmount: input.transferAmount as number,
      direction: input.direction as "ETH_TO_USDT" | "USDT_TO_ETH",
    }),
};

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

    // Emit any text content from the model
    const textContent = parts
      .filter((p) => typeof p.text === "string" && p.text)
      .map((p) => p.text as string)
      .join("");
    if (textContent) onEvent({ type: "text", content: textContent });

    // Add model response to conversation history
    messages.push({ role: "model", parts });

    // Find function call parts
    const funcCallParts = parts.filter(
      (p): p is Part & { functionCall: NonNullable<Part["functionCall"]> } =>
        p.functionCall != null
    );

    if (funcCallParts.length === 0) break;

    // Execute all tool calls in parallel
    const settled = await Promise.allSettled(
      funcCallParts.map(async (part) => {
        const name = part.functionCall.name ?? "";
        const args = (part.functionCall.args ?? {}) as ToolInput;

        onEvent({ type: "tool_start", tool: name, input: args });
        const result = await EXECUTORS[name](args);
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

    // Return tool results as a user turn with functionResponse parts
    const responseParts: Part[] = settled.map((outcome, idx) => {
      const name = funcCallParts[idx].functionCall.name ?? "";
      if (outcome.status === "fulfilled") {
        return {
          functionResponse: { name, response: { result: outcome.value.result } },
        };
      }
      const { code, message } = extractError(outcome.reason);
      onEvent({ type: "error", code, message });
      return {
        functionResponse: { name, response: { error: message, code } },
      };
    });

    messages.push({ role: "user", parts: responseParts });
  }

  onEvent({ type: "done" });
  return messages;
}
