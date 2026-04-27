import Anthropic from "@anthropic-ai/sdk";
import { isAddress } from "viem";
import { resolveIdentity } from "./tools/resolveIdentity";
import { getBalances, type GetBalancesResult } from "./tools/getBalances";
import { selectChain } from "./tools/selectChain";
import { estimateGas } from "./tools/estimateGas";
import { createTransaction, type CreateTransactionResult } from "./tools/createTransaction";
import { SUPPORTED_CHAINS, type SupportedChain } from "./web3/constants";
import { SYSTEM_PROMPT } from "./systemPrompt";

export type ConversationMessage = Anthropic.MessageParam;

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

const CHAIN_ENUM = [...SUPPORTED_CHAINS] as string[];

const TOOLS: Anthropic.Tool[] = [
  {
    name: "resolveIdentity",
    description:
      "Resolve an ENS name (e.g. alice.eth) or a 0x address to a checksummed Ethereum address.",
    input_schema: {
      type: "object" as const,
      properties: {
        identifier: {
          type: "string",
          description: "ENS name (e.g. alice.eth) or a 0x Ethereum address",
        },
      },
      required: ["identifier"],
    },
  },
  {
    name: "getBalances",
    description: `Fetch USDT and ETH balances for a wallet across all supported chains: ${SUPPORTED_CHAINS.join(", ")}.`,
    input_schema: {
      type: "object" as const,
      properties: {
        address: {
          type: "string",
          description: "The wallet address to check",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "selectChain",
    description:
      "Pick the best chain for a USDT transfer: must have enough USDT balance, ETH for gas, and the lowest total gas cost.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string", description: "Sender wallet address" },
        to: {
          type: "string",
          description: "Recipient wallet address (resolved 0x address)",
        },
        amountUSDT: { type: "number", description: "Amount of USDT to transfer" },
        balances: {
          type: "object",
          description: "The full result object returned by getBalances",
        },
      },
      required: ["from", "to", "amountUSDT", "balances"],
    },
  },
  {
    name: "estimateGas",
    description:
      "Estimate the total gas cost (including L1 data fee for L2 chains) for a USDT ERC-20 transfer on a specific chain.",
    input_schema: {
      type: "object" as const,
      properties: {
        chain: { type: "string", enum: CHAIN_ENUM },
        from: { type: "string", description: "Sender address" },
        to: { type: "string", description: "Recipient address" },
        amountUSDT: { type: "number", description: "Amount of USDT" },
      },
      required: ["chain", "from", "to", "amountUSDT"],
    },
  },
  {
    name: "createTransaction",
    description:
      "Build the final unsigned ERC-20 USDT transfer calldata with a final balance check. Call this last after selecting the chain.",
    input_schema: {
      type: "object" as const,
      properties: {
        chain: { type: "string", enum: CHAIN_ENUM },
        from: { type: "string", description: "Sender address" },
        to: { type: "string", description: "Recipient address" },
        amountUSDT: { type: "number", description: "Amount of USDT" },
      },
      required: ["chain", "from", "to", "amountUSDT"],
    },
  },
];

type ToolInput = Record<string, unknown>;

const EXECUTORS: Record<string, (input: ToolInput) => Promise<unknown>> = {
  resolveIdentity: (input) => resolveIdentity(input.identifier as string),
  getBalances: (input) => getBalances(input.address as `0x${string}`),
  selectChain: (input) =>
    selectChain({
      from: input.from as `0x${string}`,
      to: input.to as `0x${string}`,
      amountUSDT: input.amountUSDT as number,
      balances: input.balances as GetBalancesResult,
    }),
  estimateGas: (input) =>
    estimateGas({
      chain: input.chain as SupportedChain,
      from: input.from as `0x${string}`,
      to: input.to as `0x${string}`,
      amountUSDT: input.amountUSDT as number,
    }),
  createTransaction: (input) =>
    createTransaction({
      chain: input.chain as SupportedChain,
      from: input.from as `0x${string}`,
      to: input.to as `0x${string}`,
      amountUSDT: input.amountUSDT as number,
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

const anthropic = new Anthropic();
const MAX_ITERATIONS = 10;

export async function runPlanner(
  conversationHistory: ConversationMessage[],
  walletAddress: `0x${string}`,
  onEvent: (event: AgentEvent) => void
): Promise<ConversationMessage[]> {
  if (!isAddress(walletAddress)) {
    throw new Error("Invalid wallet address");
  }

  const messages: ConversationMessage[] = [...conversationHistory];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT(walletAddress),
      tools: TOOLS,
      messages,
    });

    stream.on("text", (text) => onEvent({ type: "text", content: text }));

    const response = await stream.finalMessage();
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      // Execute all tool calls from this response in parallel
      const settled = await Promise.allSettled(
        toolBlocks.map(async (block) => {
          onEvent({ type: "tool_start", tool: block.name, input: block.input });
          const result = await EXECUTORS[block.name](block.input as ToolInput);
          onEvent({ type: "tool_result", tool: block.name, result });

          if (block.name === "createTransaction") {
            const tx = result as CreateTransactionResult;
            const inp = block.input as ToolInput;
            onEvent({
              type: "decision",
              recipient: inp.to as string,
              chain: inp.chain as string,
              amountUSDT: inp.amountUSDT as number,
              gasFeeNative: tx.gasEstimate.totalFeeNative,
              transaction: tx.tx,
            });
          }

          return { id: block.id, result };
        })
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = settled.map((outcome, idx) => {
        if (outcome.status === "fulfilled") {
          return {
            type: "tool_result",
            tool_use_id: toolBlocks[idx].id,
            content: JSON.stringify(outcome.value.result),
          };
        }
        const { code, message } = extractError(outcome.reason);
        onEvent({ type: "error", code, message });
        return {
          type: "tool_result",
          tool_use_id: toolBlocks[idx].id,
          content: JSON.stringify({ error: message, code }),
          is_error: true,
        };
      });

      messages.push({ role: "user", content: toolResults });
    }
  }

  onEvent({ type: "done" });
  return messages;
}
