import { useState } from "react";
import { useSendTransaction } from "wagmi";
import type { AgentSwapDecision, UnsignedTx } from "../hooks/useAgentStream";

interface SwapDecisionCardProps {
  decision: AgentSwapDecision;
}

type TxPhase = "approve" | "swap" | "transfer";

function phaseLabel(direction: "ETH_TO_USDT" | "USDT_TO_ETH", phase: TxPhase): string {
  if (direction === "ETH_TO_USDT") {
    return phase === "swap" ? "Sign Swap (ETH → USDT)" : "Sign Transfer (USDT)";
  }
  if (phase === "approve") return "Sign Approve (USDT)";
  if (phase === "swap") return "Sign Swap (USDT → ETH)";
  return "Sign Transfer (ETH)";
}

export function SwapDecisionCard({ decision }: SwapDecisionCardProps) {
  const { sendTransactionAsync } = useSendTransaction();
  const [currentStep, setCurrentStep] = useState(0);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { direction, chain, transferTo, transferAmount, txCount, approveTx, swapTx, transferTx } = decision;

  const txQueue: { phase: TxPhase; tx: UnsignedTx }[] =
    direction === "ETH_TO_USDT"
      ? [
          { phase: "swap", tx: swapTx },
          { phase: "transfer", tx: transferTx },
        ]
      : [
          { phase: "approve", tx: approveTx! },
          { phase: "swap", tx: swapTx },
          { phase: "transfer", tx: transferTx },
        ];

  const isComplete = txHashes.length === txCount;

  const handleDemo = () => {
    setError(null);
    setTxHashes(Array.from({ length: txCount }, (_, i) => `demo-tx-${i + 1}`));
    setCurrentStep(txCount);
  };

  const handleProceed = async () => {
    if (isSubmitting || isComplete) return;
    setError(null);
    setIsSubmitting(true);
    try {
      for (let i = currentStep; i < txQueue.length; i++) {
        setCurrentStep(i);
        const { tx } = txQueue[i];
        const hash = await sendTransactionAsync({
          to: tx.to,
          data: tx.data,
          value: BigInt(tx.value ?? "0"),
        });
        setTxHashes((prev) => [...prev, hash]);
        setCurrentStep(i + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction rejected");
    } finally {
      setIsSubmitting(false);
    }
  };

  const directionLabel =
    direction === "ETH_TO_USDT" ? "ETH → USDT via Uniswap" : "USDT → ETH via Uniswap";

  const amountLabel =
    direction === "ETH_TO_USDT"
      ? `${transferAmount} USDT to recipient`
      : `${transferAmount} ETH to recipient`;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-[0_0_30px_rgba(245,158,11,0.08)]">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-amber-400">
        Swap Required
      </h2>
      <p className="mb-4 text-xs text-gray-500">{directionLabel}</p>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-gray-900/60 px-4 py-2.5">
          <span className="text-xs text-gray-500">Chain</span>
          <span className="text-sm font-medium text-gray-200 capitalize">{chain}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-900/60 px-4 py-2.5">
          <span className="text-xs text-gray-500">Recipient</span>
          <span className="break-all text-right text-sm font-medium text-gray-200">{transferTo}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-900/60 px-4 py-2.5">
          <span className="text-xs text-gray-500">You send</span>
          <span className="text-sm font-medium text-amber-400">{amountLabel}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-900/60 px-4 py-2.5">
          <span className="text-xs text-gray-500">MetaMask confirmations</span>
          <span className="text-sm font-medium text-gray-200">{txCount}</span>
        </div>
      </div>

      {/* Progress steps */}
      <div className="mb-4 flex gap-2">
        {txQueue.map((item, i) => (
          <div
            key={item.phase}
            className={`flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium transition ${
              i < txHashes.length
                ? "bg-emerald-500/20 text-emerald-400"
                : i === currentStep && isSubmitting
                ? "bg-amber-500/20 text-amber-400"
                : "bg-gray-800/60 text-gray-600"
            }`}
          >
            {i < txHashes.length ? "✓ " : `${i + 1}/${txCount} `}
            {phaseLabel(direction, item.phase)}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          className="rounded-lg border border-gray-700 px-5 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={handleDemo}
          disabled={isSubmitting || isComplete}
        >
          Demo Mode
        </button>
        <button
          className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_16px_rgba(245,158,11,0.25)]"
          type="button"
          disabled={isSubmitting || isComplete}
          onClick={handleProceed}
        >
          {isSubmitting
            ? `Signing ${currentStep + 1}/${txCount}…`
            : isComplete
            ? "Complete"
            : `Proceed (${txCount} signatures) →`}
        </button>
      </div>

      {txHashes.length > 0 && (
        <div className="mt-3 space-y-1">
          {txHashes.map((hash, i) => (
            <p
              key={hash}
              className="break-all rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400"
            >
              ✓ Tx {i + 1}: {hash}
            </p>
          ))}
        </div>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          ✗ {error}
        </p>
      )}
    </div>
  );
}
