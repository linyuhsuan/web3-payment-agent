import { encodeFunctionData, parseEther, parseUnits } from "viem";
import { ERC20_ABI, USDT_ADDRESSES, USDT_DECIMALS, type SupportedChain } from "../web3/constants";
import { CHAIN_IDS } from "../web3/providers";
import { getCachedQuote } from "./getSwapQuote";
import { uniswapPost } from "../web3/uniswapApi";

export interface UnsignedTx {
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
}

export interface BuildSwapTxInput {
  quoteId: string;
  chain: SupportedChain;
  from: `0x${string}`;
  transferTo: `0x${string}`;
  transferAmount: number;
  direction: "ETH_TO_USDT" | "USDT_TO_ETH";
}

export interface BuildSwapTxResult {
  direction: "ETH_TO_USDT" | "USDT_TO_ETH";
  txCount: 2 | 3;
  approveTx?: UnsignedTx;
  swapTx: UnsignedTx;
  transferTx: UnsignedTx;
}

async function callUniswapSwap(quoteResponse: unknown, chain: SupportedChain): Promise<Record<string, unknown>> {
  const body = Object.fromEntries(
    Object.entries(quoteResponse as Record<string, unknown>).filter(([, v]) => v != null)
  );
  const result = await uniswapPost("/swap", { ...body, chainId: CHAIN_IDS[chain] });
  return result as Record<string, unknown>;
}

export async function buildSwapTx(input: BuildSwapTxInput): Promise<BuildSwapTxResult> {
  const { quoteId, chain, from, transferTo, transferAmount, direction } = input;

  // Retrieve cached quote; reject if expired so user sees current prices
  const cached = getCachedQuote(quoteId);
  if (!cached) {
    throw new Error(
      "Swap quote has expired (quotes are valid for 30 seconds). Please send your request again to get a fresh quote."
    );
  }

  const swapResponse = await callUniswapSwap(cached.quoteResponse, chain);
  const swap = swapResponse.swap as Record<string, unknown> | undefined;

  if (!swap?.data || swap.data === "0x") {
    throw new Error(`[buildSwapTx] Swap data is empty — quote may have expired`);
  }

  const swapTx: UnsignedTx = {
    from,
    to: swap.to as `0x${string}`,
    data: swap.data as `0x${string}`,
    value: (swap.value as string) ?? "0",
  };

  if (direction === "ETH_TO_USDT") {
    // After swap, transfer USDT ERC-20 to recipient
    const usdtAddress = USDT_ADDRESSES[chain] as `0x${string}`;
    const transferData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [transferTo, parseUnits(transferAmount.toString(), USDT_DECIMALS)],
    });
    const transferTx: UnsignedTx = {
      from,
      to: usdtAddress,
      data: transferData,
      value: "0",
    };
    console.log(`[buildSwapTx] ETH_TO_USDT chain=${chain} txCount=2`);
    return { direction, txCount: 2, swapTx, transferTx };
  }

  // USDT_TO_ETH: need approve + swap + transfer
  const usdtAddress = USDT_ADDRESSES[chain] as `0x${string}`;
  const quoteData = cached.quoteResponse as Record<string, unknown>;
  const quote = quoteData.quote as Record<string, unknown> | undefined;
  const amountInRaw =
    (quote?.input as Record<string, unknown>)?.amount as string | undefined
    ?? quote?.amountIn as string | undefined
    ?? parseUnits((transferAmount * 1.01).toString(), USDT_DECIMALS).toString();

  const approveData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [swap.to as `0x${string}`, BigInt(amountInRaw)],
  });
  const approveTx: UnsignedTx = {
    from,
    to: usdtAddress,
    data: approveData,
    value: "0",
  };

  // After swap receives ETH, transfer native ETH to recipient
  const transferTx: UnsignedTx = {
    from,
    to: transferTo,
    data: "0x",
    value: parseEther(transferAmount.toString()).toString(),
  };

  console.log(`[buildSwapTx] USDT_TO_ETH chain=${chain} txCount=3`);
  return { direction, txCount: 3, approveTx, swapTx, transferTx };
}
