import { useRef, useState } from "react";
import { useSendTransaction, usePublicClient, useChainId, useSwitchChain } from "wagmi";
import { mainnet, arbitrum, optimism, base, polygon, sepolia } from "wagmi/chains";
import type { AgentSwapDecision, UnsignedTx } from "../../hooks/useAgentStream";

interface SwapDecisionCardProps {
  decision: AgentSwapDecision;
}

type TxPhase = "approve" | "swap" | "transfer";

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
  const publicClient = usePublicClient();
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [currentStep, setCurrentStep] = useState(0);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { direction, chain, transferTo, transferAmount, txCount, approveTx, swapTx, transferTx } = decision;

  const targetChainId = CHAIN_IDS[chain.toLowerCase()];
  const isWrongChain = targetChainId === undefined || currentChainId !== targetChainId;
  const targetChainName = CHAIN_NAMES[targetChainId] ?? chain;
  const currentChainName = CHAIN_NAMES[currentChainId] ?? `Chain ${currentChainId}`;

  const txQueue: { phase: TxPhase; tx: UnsignedTx }[] = (() => {
    if (direction === "ETH_TO_USDT") {
      return [
        { phase: "swap" as TxPhase, tx: swapTx },
        { phase: "transfer" as TxPhase, tx: transferTx },
      ];
    }
    if (!approveTx) {
      return [];
    }
    return [
      { phase: "approve" as TxPhase, tx: approveTx },
      { phase: "swap" as TxPhase, tx: swapTx },
      { phase: "transfer" as TxPhase, tx: transferTx },
    ];
  })();

  const isComplete = txHashes.length === txCount;
  const submittingRef = useRef(false);

  const handleProceed = async () => {
    if (submittingRef.current || isComplete || txQueue.length === 0) return;
    if (!approveTx && direction === "USDT_TO_ETH") {
      setError("Missing approve transaction data. Please try again.");
      return;
    }
    submittingRef.current = true;
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
        // Wait for on-chain confirmation before submitting the next tx
        if (i < txQueue.length - 1 && publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        setCurrentStep(i + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction rejected");
    } finally {
      submittingRef.current = false;
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
        className="w-full rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_16px_rgba(245,158,11,0.25)]"
        type="button"
        disabled={isSubmitting || isComplete || isWrongChain}
        onClick={handleProceed}
      >
        {isSubmitting
          ? `Signing ${currentStep + 1}/${txCount}…`
          : isComplete
          ? "Complete ✓"
          : `Proceed (${txCount} signatures) →`}
      </button>

      {txHashes.length > 0 && (
        <div className="mt-3 space-y-2">
          {txHashes.map((hash, i) => (
            <div key={hash} className="rounded-lg bg-emerald-500/10 px-4 py-2.5">
              <p className="mb-1 text-xs font-semibold text-emerald-400">✓ Transaction Successful</p>
              <p className="text-xs text-gray-400 mb-0.5">Transaction Hash {txHashes.length > 1 ? `(${i + 1}/${txHashes.length})` : ""}</p>
              <p className="break-all text-sm text-emerald-400">{hash}</p>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg bg-red-500/10 px-4 py-2.5">
          <p className="mb-1 text-xs font-semibold text-red-400">✗ Transaction Failed</p>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
