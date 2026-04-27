import { encodeFunctionData, parseUnits } from "viem";
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
  amountUSDT: number;
  chain: SupportedChain;
}

export interface CreateTransactionResult {
  chain: SupportedChain;
  tokenAddress: `0x${string}`;
  amountRaw: string;
  tx: {
    from: `0x${string}`;
    to: `0x${string}`;
    data: `0x${string}`;
    value: "0";
  };
  gasEstimate: Awaited<ReturnType<typeof estimateGas>>;
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<CreateTransactionResult> {
  const latestBalances = await getBalances(input.from, [input.chain]);
  const chainBalance = latestBalances.balances[input.chain];

  if (chainBalance.hasError) {
    throw new Error(`[createTransaction] Balance check failed on ${input.chain}`);
  }
  if (Number(chainBalance.usdt) < input.amountUSDT) {
    throw new Error(
      `[createTransaction] Insufficient USDT on ${input.chain}. need=${input.amountUSDT}, have=${chainBalance.usdt}`
    );
  }
  if (Number(chainBalance.eth) <= 0) {
    throw new Error(`[createTransaction] Insufficient native token for gas on ${input.chain}`);
  }

  const amountRaw = parseUnits(input.amountUSDT.toString(), USDT_DECIMALS);
  const tokenAddress = USDT_ADDRESSES[input.chain] as `0x${string}`;
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [input.to, amountRaw],
  });

  const gasEstimate = await estimateGas({
    chain: input.chain,
    from: input.from,
    to: input.to,
    amountUSDT: input.amountUSDT,
  });
  console.log(
    `[createTransaction] chain=${input.chain} from=${input.from} to=${input.to} amountUSDT=${input.amountUSDT}`
  );

  return {
    chain: input.chain,
    tokenAddress,
    amountRaw: amountRaw.toString(),
    tx: {
      from: input.from,
      to: tokenAddress,
      data,
      value: "0",
    },
    gasEstimate,
  };
}
