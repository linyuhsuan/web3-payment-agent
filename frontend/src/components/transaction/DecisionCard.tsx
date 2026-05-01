import { useState } from "react";
import { useSendTransaction, useChainId, useSwitchChain } from "wagmi";
import { mainnet, arbitrum, optimism, base, polygon, sepolia } from "wagmi/chains";
import type { AgentDecision } from "../../hooks/useAgentStream";

interface DecisionCardProps {
  decision: AgentDecision;
}

const CHAIN_IDS: Record<string, number> = {
  ethereum: mainnet.id,
  mainnet: mainnet.id,
  arbitrum: arbitrum.id,
  optimism: optimism.id,
  base: base.id,
  polygon: polygon.id,
  sepolia: sepolia.id,
};

const CHAIN_NAMES: Record<number, string> = {
  [mainnet.id]: "Ethereum",
  [arbitrum.id]: "Arbitrum",
  [optimism.id]: "Optimism",
  [base.id]: "Base",
  [polygon.id]: "Polygon",
  [sepolia.id]: "Sepolia",
};

export function DecisionCard({ decision }: DecisionCardProps) {
  const { sendTransactionAsync } = useSendTransaction();
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetChainId = CHAIN_IDS[decision.chain.toLowerCase()];
  const isWrongChain = targetChainId === undefined || currentChainId !== targetChainId;
  const targetChainName = CHAIN_NAMES[targetChainId] ?? decision.chain;
  const currentChainName = CHAIN_NAMES[currentChainId] ?? `Chain ${currentChainId}`;

  const handleReal = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      const hash = await sendTransactionAsync({
        to: decision.transaction.to,
        data: decision.transaction.data,
        value: BigInt(decision.transaction.value ?? "0"),
      });
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction rejected");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-5 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-violet-400">
        Decision Ready
      </h2>
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-gray-900/60 px-4 py-2.5">
          <span className="text-xs text-gray-500">Recipient</span>
          <span className="break-all text-right text-sm font-medium text-gray-200">{decision.recipient}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-900/60 px-4 py-2.5">
          <span className="text-xs text-gray-500">Chain</span>
          <span className="text-sm font-medium text-gray-200 capitalize">{decision.chain}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-900/60 px-4 py-2.5">
          <span className="text-xs text-gray-500">Amount</span>
          <span className="text-sm font-medium text-emerald-400">
            {decision.targetToken === "ETH"
              ? `${decision.amountETH} ETH`
              : `${decision.amountUSDT} USDT`}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-900/60 px-4 py-2.5">
          <span className="text-xs text-gray-500">Estimated Gas</span>
          <span className="text-sm font-medium text-gray-200">{decision.gasFeeNative}</span>
        </div>
      </div>

      {isWrongChain && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-xs text-amber-300">
            Wallet is on <span className="font-semibold">{currentChainName}</span>. Switch to{" "}
            <span className="font-semibold">{targetChainName}</span> to proceed.
          </p>
          <button
            type="button"
            className="ml-3 shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-gray-950 transition hover:bg-amber-400"
            onClick={() => switchChain({ chainId: targetChainId })}
          >
            Switch to {targetChainName}
          </button>
        </div>
      )}

      <button
        className="w-full rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_16px_rgba(139,92,246,0.3)]"
        type="button"
        disabled={isSubmitting || isWrongChain || !!txHash}
        onClick={handleReal}
      >
        {isSubmitting ? "Submitting…" : txHash ? "Sent ✓" : "Sign & Send →"}
      </button>

      {txHash && (
        <p className="mt-3 break-all rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
          ✓ {txHash}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          ✗ {error}
        </p>
      )}
    </div>
  );
}
