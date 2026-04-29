import { useState } from "react";
import { useSendTransaction } from "wagmi";
import type { AgentDecision } from "../hooks/useAgentStream";

interface DecisionCardProps {
  decision: AgentDecision;
}

export function DecisionCard({ decision }: DecisionCardProps) {
  const { sendTransactionAsync } = useSendTransaction();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDemo = () => {
    setError(null);
    setTxHash("demo-mode-no-broadcast");
  };

  const handleReal = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      const hash = await sendTransactionAsync({
        to: decision.transaction.to,
        data: decision.transaction.data,
        value: 0n,
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
          <span className="text-sm font-medium text-emerald-400">{decision.amountUSDT} USDT</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-900/60 px-4 py-2.5">
          <span className="text-xs text-gray-500">Estimated Gas</span>
          <span className="text-sm font-medium text-gray-200">{decision.gasFeeNative}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-gray-700 px-5 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={handleDemo}
        >
          Demo Mode
        </button>
        <button
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_16px_rgba(139,92,246,0.3)]"
          type="button"
          disabled={isSubmitting}
          onClick={handleReal}
        >
          {isSubmitting ? "Submitting…" : "Sign & Send →"}
        </button>
      </div>
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

