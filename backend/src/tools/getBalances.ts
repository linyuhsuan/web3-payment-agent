import { formatUnits, formatEther } from "viem";
import { getClient } from "../web3/providers";
import { USDT_ADDRESSES, SUPPORTED_CHAINS, ERC20_ABI, USDT_DECIMALS, type SupportedChain } from "../web3/constants";

export interface ChainBalance {
  usdt: string;
  eth: string;
  hasError: boolean;
}

export interface GetBalancesResult {
  balances: Record<SupportedChain, ChainBalance>;
  totalUSDT: string;
  availableChains: SupportedChain[];
}

async function fetchChainBalance(
  chain: SupportedChain,
  address: `0x${string}`
): Promise<ChainBalance> {
  const client = getClient(chain);

  const [usdtRaw, ethRaw] = await Promise.all([
    client.readContract({
      address: USDT_ADDRESSES[chain] as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }),
    client.getBalance({ address }),
  ]);

  return {
    usdt: formatUnits(usdtRaw as bigint, USDT_DECIMALS),
    eth: formatEther(ethRaw as bigint),
    hasError: false,
  };
}

export async function getBalances(
  address: `0x${string}`,
  chains: SupportedChain[] = SUPPORTED_CHAINS
): Promise<GetBalancesResult> {
  const results = await Promise.allSettled(
    chains.map((chain) => fetchChainBalance(chain, address))
  );

  const balances = {} as Record<SupportedChain, ChainBalance>;
  let totalUSDT = 0;
  const availableChains: SupportedChain[] = [];

  results.forEach((result, i) => {
    const chain = chains[i];
    if (result.status === "fulfilled") {
      balances[chain] = result.value;
      const usdtAmount = parseFloat(result.value.usdt);
      if (usdtAmount > 0) {
        totalUSDT += usdtAmount;
        availableChains.push(chain);
      }
    } else {
      console.error(`[getBalances] ${chain} failed:`, result.reason);
      balances[chain] = { usdt: "0", eth: "0", hasError: true };
    }
  });

  return {
    balances,
    totalUSDT: totalUSDT.toFixed(6),
    availableChains,
  };
}
