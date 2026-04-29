import { encodeFunctionData, parseEther, parseUnits } from "viem";
import {
  ERC20_ABI,
  USDT_ADDRESSES,
  USDT_DECIMALS,
  type SupportedChain,
} from "../web3/constants";
import { estimateGas } from "./estimateGas";
import { getBalances } from "./getBalances";

export interface CreateTransactionInput {
  from: `0x${string}`;
  to: `0x${string}`;
  chain: SupportedChain;
  targetToken?: "USDT" | "ETH";
  amountUSDT?: number;
  amountETH?: number;
}

export interface CreateTransactionResult {
  chain: SupportedChain;
  targetToken: "USDT" | "ETH";
  tokenAddress?: `0x${string}`;
  amountRaw: string;
  tx: {
    from: `0x${string}`;
    to: `0x${string}`;
    data: `0x${string}`;
    value: string;
  };
  gasEstimate: Awaited<ReturnType<typeof estimateGas>>;
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<CreateTransactionResult> {
  const { chain, from, to, targetToken = "USDT", amountUSDT, amountETH } = input;

  const latestBalances = await getBalances(from, [chain]);
  const chainBalance = latestBalances.balances[chain];

  if (chainBalance.hasError) {
    throw new Error(`[createTransaction] Balance check failed on ${chain}`);
  }

  if (targetToken === "ETH") {
    const amount = amountETH ?? 0;
    if (Number(chainBalance.eth) < amount) {
      throw new Error(
        `[createTransaction] Insufficient ETH on ${chain}. need=${amount}, have=${chainBalance.eth}`
      );
    }
    const amountRaw = parseEther(amount.toString());
    const gasEstimate = await estimateGas({ chain, from, to, targetToken: "ETH", amountETH: amount });
    console.log(`[createTransaction] ETH chain=${chain} from=${from} to=${to} amountETH=${amount}`);
    return {
      chain,
      targetToken: "ETH",
      amountRaw: amountRaw.toString(),
      tx: { from, to, data: "0x", value: amountRaw.toString() },
      gasEstimate,
    };
  }

  // USDT path
  const amount = amountUSDT ?? 0;
  if (Number(chainBalance.usdt) < amount) {
    throw new Error(
      `[createTransaction] Insufficient USDT on ${chain}. need=${amount}, have=${chainBalance.usdt}`
    );
  }
  if (Number(chainBalance.eth) <= 0) {
    throw new Error(`[createTransaction] Insufficient native token for gas on ${chain}`);
  }

  const amountRaw = parseUnits(amount.toString(), USDT_DECIMALS);
  const tokenAddress = USDT_ADDRESSES[chain] as `0x${string}`;
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to, amountRaw],
  });
  const gasEstimate = await estimateGas({ chain, from, to, targetToken: "USDT", amountUSDT: amount });
  console.log(`[createTransaction] USDT chain=${chain} from=${from} to=${to} amountUSDT=${amount}`);

  return {
    chain,
    targetToken: "USDT",
    tokenAddress,
    amountRaw: amountRaw.toString(),
    tx: { from, to: tokenAddress, data, value: "0" },
    gasEstimate,
  };
}
