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
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Decision Card</h2>
      <p className="mb-1 break-all text-sm text-gray-900">Recipient: {decision.recipient}</p>
      <p className="mb-1 text-sm text-gray-900">Chain: {decision.chain}</p>
      <p className="mb-1 text-sm text-gray-900">Amount: {decision.amountUSDT} USDT</p>
      <p className="mb-1 text-sm text-gray-900">Estimated Gas: {decision.gasFeeNative}</p>
      <div className="mt-3 flex gap-2">
        <button
          className="rounded-lg bg-violet-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={handleDemo}
        >
          Demo Mode
        </button>
        <button
          className="rounded-lg bg-violet-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={isSubmitting}
          onClick={handleReal}
        >
          {isSubmitting ? "Submitting..." : "Real Mode"}
        </button>
      </div>
      {txHash && <p className="mt-2 break-all text-sm text-gray-900">Result: {txHash}</p>}
      {error && <p className="mt-2 text-sm text-red-500">Failed: {error}</p>}
    </div>
  );
}

