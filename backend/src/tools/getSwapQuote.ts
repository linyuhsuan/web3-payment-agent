import { formatEther, formatUnits, parseUnits } from "viem";
import { USDT_ADDRESSES, USDT_DECIMALS, type SupportedChain } from "../web3/constants";
import { CHAIN_IDS } from "../web3/providers";
import { uniswapPost } from "../web3/uniswapApi";

const NATIVE_ETH = "0x0000000000000000000000000000000000000000";
const QUOTE_TTL_MS = 30_000;

export interface GetSwapQuoteInput {
  direction: "ETH_TO_USDT" | "USDT_TO_ETH";
  chain: SupportedChain;
  from: `0x${string}`;
  to: `0x${string}`;
  amountOut: number;
}

export interface GetSwapQuoteResult {
  direction: "ETH_TO_USDT" | "USDT_TO_ETH";
  chain: SupportedChain;
  amountIn: string;
  amountOut: string;
  gasFeeUSD: string;
  quoteId: string;
}

interface CacheEntry {
  result: GetSwapQuoteResult;
  quoteResponse: unknown;
  expiry: number;
}

export const quoteCache = new Map<string, CacheEntry>();

function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function classifyUniswapError(status: number, body: string, chain: SupportedChain, direction: string): string {
  const directionLabel = direction === "ETH_TO_USDT" ? "ETH → USDT" : "USDT → ETH";
  const parsed = safeParseJson(body);
  const detail = String(parsed?.detail ?? parsed?.errorCode ?? "").toLowerCase();

  if (status === 404 || detail.includes("no quotes")) {
    return `No swap route available for ${directionLabel} on ${chain}. This network may not be supported by Uniswap, or there is insufficient liquidity for this amount.`;
  }
  if (status === 400) return `Invalid swap request for ${directionLabel} on ${chain}. Please check the amount and try again.`;
  if (status === 429) return `Uniswap API rate limit reached. Please wait a moment and try again.`;
  if (status >= 500) return `Uniswap service is temporarily unavailable. Please try again later.`;
  return `Could not get a swap quote for ${directionLabel} on ${chain}. Please try again.`;
}

export function getCachedQuote(quoteId: string): CacheEntry | null {
  const entry = quoteCache.get(quoteId);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    quoteCache.delete(quoteId);
    return null;
  }
  return entry;
}

export async function getSwapQuote(input: GetSwapQuoteInput): Promise<GetSwapQuoteResult> {
  const { direction, chain, from, amountOut } = input;
  const chainId = CHAIN_IDS[chain];
  const usdtAddress = USDT_ADDRESSES[chain];

  const tokenIn = direction === "ETH_TO_USDT" ? NATIVE_ETH : usdtAddress;
  const tokenOut = direction === "ETH_TO_USDT" ? usdtAddress : NATIVE_ETH;

  // EXACT_OUTPUT: specify how much output token we want
  const amountRaw =
    direction === "ETH_TO_USDT"
      ? parseUnits(amountOut.toString(), USDT_DECIMALS).toString()
      : parseUnits(amountOut.toString(), 18).toString(); // ETH has 18 decimals

  const body = {
    type: "EXACT_OUTPUT",
    tokenInChainId: chainId,
    tokenOutChainId: chainId,
    tokenIn,
    tokenOut,
    amount: amountRaw,
    swapper: from,
  };

  let quoteResponse: Record<string, unknown>;
  try {
    quoteResponse = (await uniswapPost("/quote", body)) as Record<string, unknown>;
  } catch (err) {
    const e = err as { status?: number; body?: string };
    const status = e.status ?? 500;
    const rawBody = e.body ?? (err instanceof Error ? err.message : String(err));
    console.error(`[getSwapQuote] Uniswap API error ${status}: ${rawBody}`);
    throw new Error(classifyUniswapError(status, rawBody, chain, direction));
  }
  const quote = quoteResponse.quote as Record<string, unknown> | undefined;

  if (!quote) {
    throw new Error(`No swap route found on ${chain}. Please try a different amount or chain.`);
  }

  const amountInRaw = (quote.input as Record<string, unknown>)?.amount as string | undefined
    ?? quote.amountIn as string | undefined;
  const gasFeeUSD = (quote.gasFeeUSD ?? quote.gasUseEstimateUSD ?? "0") as string;

  const amountInFormatted =
    direction === "ETH_TO_USDT"
      ? formatEther(BigInt(amountInRaw ?? "0"))
      : formatUnits(BigInt(amountInRaw ?? "0"), USDT_DECIMALS);

  const quoteId = `${chain}-${direction}-${Date.now()}`;

  const result: GetSwapQuoteResult = {
    direction,
    chain,
    amountIn: amountInFormatted,
    amountOut: amountOut.toString(),
    gasFeeUSD,
    quoteId,
  };

  quoteCache.set(quoteId, {
    result,
    quoteResponse,
    expiry: Date.now() + QUOTE_TTL_MS,
  });

  console.log(
    `[getSwapQuote] direction=${direction} chain=${chain} amountIn=${amountInFormatted} amountOut=${amountOut} gasFeeUSD=${gasFeeUSD}`
  );

  return result;
}
