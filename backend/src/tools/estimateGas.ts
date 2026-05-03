import { encodeFunctionData, formatEther, parseEther, parseUnits } from "viem";
import {
  ERC20_ABI,
  USDT_ADDRESSES,
  USDT_DECIMALS,
  type SupportedChain,
} from "../web3/constants";
import { getClient } from "../web3/providers";

function toBigint(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "string") {
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }
  return null;
}

async function estimateL1DataFeeWei(chain: SupportedChain, tx: { to: `0x${string}`; data: `0x${string}`; from: `0x${string}`; value: bigint }) {
  const client = getClient(chain);

  if (chain === "optimism" || chain === "base") {
    try {
      const l1Fee = await (client as unknown as {
        request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
      }).request({
        method: "eth_estimateL1Fee",
        params: [tx],
      });
      return toBigint(l1Fee) ?? 0n;
    } catch {
      return 0n;
    }
  }

  if (chain === "arbitrum") {
    try {
      const components = await (client as unknown as {
        request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
      }).request({
        method: "arb_gasEstimateComponents",
        params: [tx, "latest"],
      });

      const l1FeeHex = (components as { gasEstimateForL1?: string }).gasEstimateForL1;
      return toBigint(l1FeeHex) ?? 0n;
    } catch {
      return 0n;
    }
  }

  return 0n;
}

export interface EstimateGasResult {
  chain: SupportedChain;
  gasLimit: string;
  maxFeePerGasWei: string;
  l1DataFeeWei: string;
  totalFeeWei: string;
  totalFeeNative: string;
}

export interface EstimateGasInput {
  chain: SupportedChain;
  from: `0x${string}`;
  to: `0x${string}`;
  amountUSDT?: number;
  targetToken?: "USDT" | "ETH";
  amountETH?: number;
}

export async function estimateGas(input: EstimateGasInput): Promise<EstimateGasResult> {
  const { chain, from, to, amountUSDT, targetToken = "USDT", amountETH } = input;

  if (!from || from === "0x0000000000000000000000000000000000000000") {
    throw new Error(`[estimateGas] Invalid sender address: "${from}". Wallet not connected?`);
  }

  const client = getClient(chain);

  let txForEstimate: { from: `0x${string}`; to: `0x${string}`; data: `0x${string}`; value: bigint };

  if (targetToken === "ETH") {
    txForEstimate = {
      from,
      to,
      data: "0x",
      value: parseEther((amountETH ?? 0).toString()),
    };
  } else {
    const tokenAddress = USDT_ADDRESSES[chain] as `0x${string}`;
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to, parseUnits((amountUSDT ?? 0).toString(), USDT_DECIMALS)],
    });
    txForEstimate = {
      from,
      to: tokenAddress,
      data,
      value: 0n,
    };
  }

  const gasLimit = await client.estimateGas(txForEstimate);
  const fees = await client.estimateFeesPerGas();
  const maxFeePerGas = fees.maxFeePerGas ?? fees.gasPrice;

  if (!maxFeePerGas) {
    throw new Error(`[estimateGas] ${chain} failed to get fee data`);
  }

  const l1DataFee = await estimateL1DataFeeWei(chain, txForEstimate);
  const totalFeeWei = maxFeePerGas * gasLimit + l1DataFee;
  const result: EstimateGasResult = {
    chain,
    gasLimit: gasLimit.toString(),
    maxFeePerGasWei: maxFeePerGas.toString(),
    l1DataFeeWei: l1DataFee.toString(),
    totalFeeWei: totalFeeWei.toString(),
    totalFeeNative: formatEther(totalFeeWei),
  };

  console.log(
    `[estimateGas] chain=${chain} totalFeeNative=${result.totalFeeNative} maxFeePerGasWei=${result.maxFeePerGasWei}`
  );

  return result;
}
