import { useState, useEffect } from "react";
import { BACKEND_URL } from "../web3/constants";

export interface ChainBalance {
  usdt: string;
  eth: string;
  hasError: boolean;
}

export interface BalancesResult {
  balances: Record<string, ChainBalance>;
  totalUSDT: string;
  availableChains: string[];
}

export function useBalances(address: string | undefined) {
  const [fetchedAddress, setFetchedAddress] = useState<string | undefined>(undefined);
  const [data, setData] = useState<BalancesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    // Avoid synchronous setState calls inside the effect body.
    const run = async () => {
      // Yield so the effect doesn't synchronously trigger cascading renders.
      await Promise.resolve();
      if (cancelled) return;

      setLoading(true);
      setError(null);

      try {
        const r = await fetch(`${BACKEND_URL}/api/balances?address=${address}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const result = (await r.json()) as BalancesResult;

        if (!cancelled) {
          setData(result);
          setFetchedAddress(address);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => { cancelled = true; };
  }, [address]);

  const resolvedData = address && address === fetchedAddress ? data : null;

  return { data: resolvedData, loading, error };
}
