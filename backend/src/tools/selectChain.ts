import type { SupportedChain } from "../web3/constants";
import { estimateGas, type EstimateGasResult } from "./estimateGas";
import { type GetBalancesResult } from "./getBalances";

export interface SelectChainInput {
  from: `0x${string}`;
  to: `0x${string}`;
  amountUSDT: number;
  balances: GetBalancesResult;
}

export interface SelectChainResult {
  selectedChain: SupportedChain;
  gasByChain: EstimateGasResult[];
}

export async function selectChain(input: SelectChainInput): Promise<SelectChainResult> {
  const eligibleChains = Object.entries(input.balances.balances)
    .filter((entry): entry is [SupportedChain, GetBalancesResult["balances"][SupportedChain]] => {
      const [_, balance] = entry as [SupportedChain, GetBalancesResult["balances"][SupportedChain]];
      return !balance.hasError && Number(balance.usdt) >= input.amountUSDT && Number(balance.eth) > 0;
    })
    .map(([chain]) => chain);

  if (eligibleChains.length === 0) {
    throw new Error(
      `[selectChain] No chain has enough USDT(${input.amountUSDT}) and native token for gas`
    );
  }

  const gasByChain = await Promise.all(
    eligibleChains.map((chain) =>
      estimateGas({
        chain,
        from: input.from,
        to: input.to,
        amountUSDT: input.amountUSDT,
      })
    )
  );
  gasByChain.sort((a, b) => BigInt(a.totalFeeWei) < BigInt(b.totalFeeWei) ? -1 : 1);

  const selectedChain = gasByChain[0].chain;
  console.log(
    `[selectChain] selected=${selectedChain} amountUSDT=${input.amountUSDT} candidates=${eligibleChains.join(",")}`
  );

  return { selectedChain, gasByChain };
}
