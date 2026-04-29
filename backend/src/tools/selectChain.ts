import type { SupportedChain } from "../web3/constants";
import { estimateGas, type EstimateGasResult } from "./estimateGas";
import { type GetBalancesResult } from "./getBalances";

export interface SelectChainInput {
  from: `0x${string}`;
  to: `0x${string}`;
  amountUSDT?: number;
  balances: GetBalancesResult;
  targetToken?: "USDT" | "ETH";
  amountETH?: number;
}

export interface SelectChainResult {
  selectedChain: SupportedChain;
  gasByChain: EstimateGasResult[];
}

export async function selectChain(input: SelectChainInput): Promise<SelectChainResult> {
  const { targetToken = "USDT", amountETH, amountUSDT } = input;

  // Gemini may pass the full GetBalancesResult or just the inner balances map
  const balancesMap: GetBalancesResult["balances"] =
    input.balances?.balances ?? (input.balances as unknown as GetBalancesResult["balances"]);

  const eligibleChains = Object.entries(balancesMap ?? {})
    .filter((entry): entry is [SupportedChain, GetBalancesResult["balances"][SupportedChain]] => {
      const [_, balance] = entry as [SupportedChain, GetBalancesResult["balances"][SupportedChain]];
      if (balance.hasError) return false;
      if (targetToken === "ETH") {
        // Need enough ETH to cover transfer amount + ~5% buffer for gas
        return Number(balance.eth) >= (amountETH ?? 0) * 1.05;
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

  const gasByChain = await Promise.all(
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
  gasByChain.sort((a, b) => BigInt(a.totalFeeWei) < BigInt(b.totalFeeWei) ? -1 : 1);

  const selectedChain = gasByChain[0].chain;
  console.log(
    `[selectChain] selected=${selectedChain} targetToken=${targetToken} candidates=${eligibleChains.join(",")}`
  );

  return { selectedChain, gasByChain };
}
