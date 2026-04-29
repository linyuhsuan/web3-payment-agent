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
  const [data, setData] = useState<BalancesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${BACKEND_URL}/api/balances?address=${address}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<BalancesResult>;
      })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [address]);

  return { data, loading, error };
}
