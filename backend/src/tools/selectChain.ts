import type { SupportedChain } from "../web3/constants";
import { estimateGas, type EstimateGasResult } from "./estimateGas";
import { getBalances, type GetBalancesResult } from "./getBalances";

export interface SelectChainInput {
  from: `0x${string}`;
  to: `0x${string}`;
  amountUSDT?: number;
  balances?: GetBalancesResult;
  targetToken?: "USDT" | "ETH";
  amountETH?: number;
}

export interface SelectChainResult {
  selectedChain: SupportedChain;
  gasByChain: EstimateGasResult[];
}

export async function selectChain(input: SelectChainInput): Promise<SelectChainResult> {
  const { targetToken = "USDT", amountETH, amountUSDT } = input;

  // Always fetch fresh balances to avoid Gemini passing incomplete/wrong data
  const freshBalances = await getBalances(input.from);
  const balancesMap = freshBalances.balances;

  console.log(`[selectChain] targetToken=${targetToken} amountETH=${amountETH} amountUSDT=${amountUSDT}`);
  Object.entries(balancesMap).forEach(([chain, b]) => {
    console.log(`[selectChain] ${chain}: eth=${b.eth} usdt=${b.usdt} hasError=${b.hasError}`);
  });

  const eligibleChains = Object.entries(balancesMap)
    .filter((entry): entry is [SupportedChain, GetBalancesResult["balances"][SupportedChain]] => {
      const [_, balance] = entry as [SupportedChain, GetBalancesResult["balances"][SupportedChain]];
      if (balance.hasError) return false;
      if (targetToken === "ETH") {
        // Need ETH for transfer + minimum gas buffer (0.0003 ETH covers L2s and mainnet)
        const gasBuffer = Math.max(0.0003, (amountETH ?? 0) * 0.05);
        return Number(balance.eth) >= (amountETH ?? 0) + gasBuffer;
      }
      return Number(balance.usdt) >= (amountUSDT ?? 0) && Number(balance.eth) > 0;
    })
    .map(([chain]) => chain);

  if (!balancesMap || eligibleChains.length === 0) {
    const label = targetToken === "ETH"
      ? `ETH(${amountETH})`
      : `USDT(${amountUSDT})`;
    throw new Error(`[selectChain] No chain has enough ${label} and native token for gas`);
  }

  const gasResults = await Promise.allSettled(
    eligibleChains.map((chain) =>
      estimateGas({
        chain,
        from: input.from,
        to: input.to,
        targetToken,
        amountUSDT,
        amountETH,
      })
    )
  );

  const gasByChain = gasResults
    .filter((r): r is PromiseFulfilledResult<EstimateGasResult> => r.status === "fulfilled")
    .map((r) => r.value);

  gasResults.forEach((r, i) => {
    if (r.status === "rejected") {
      console.warn(`[selectChain] estimateGas failed on ${eligibleChains[i]}:`, r.reason);
    }
  });

  if (gasByChain.length === 0) {
    throw new Error(`[selectChain] Gas estimation failed on all eligible chains: ${eligibleChains.join(", ")}`);
  }

  gasByChain.sort((a, b) => BigInt(a.totalFeeWei) < BigInt(b.totalFeeWei) ? -1 : 1);

  const selectedChain = gasByChain[0].chain;
  console.log(
    `[selectChain] selected=${selectedChain} targetToken=${targetToken} candidates=${eligibleChains.join(",")}`
  );

  return { selectedChain, gasByChain };
}
