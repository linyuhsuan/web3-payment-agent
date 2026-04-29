import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { Navbar } from "../components/Navbar";
import { ChatInput } from "../components/ChatInput";
import { BalanceDisplay } from "../components/BalanceDisplay";
import { AgentSteps } from "../components/AgentSteps";
import { DecisionCard } from "../components/DecisionCard";
import { SwapDecisionCard } from "../components/SwapDecisionCard";
import { useAgentStream } from "../hooks/useAgentStream";

const EXAMPLES = [
  "Send 50 USDT to alice.eth",
  "Send 0.01 ETH to vitalik.eth",
  "Pay alice.eth 100 USDT",
  "Transfer 0.005 ETH to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
];

const STEPS_GUIDE = [
  { icon: "🔗", title: "Connect Wallet", desc: "Click \"Connect Wallet\" in the top right to link your wallet." },
  { icon: "💬", title: "Type your intent", desc: "Describe your payment naturally — recipient, amount, token." },
  { icon: "🤖", title: "Agent reasons", desc: "AI resolves ENS, scans 5 chains, picks the optimal path automatically." },
  { icon: "✍️", title: "Sign in MetaMask", desc: "Review the decision card, then confirm the transaction in your wallet." },
];

export default function AppPage() {
  const { address } = useAccount();
  const { steps, claudeText, decision, swapDecision, hasSteps, isStreaming, streamError, startLiveStream, clearSession } =
    useAgentStream();
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = useCallback(
    async (message: string, walletAddress: string) => {
      await startLiveStream(message, walletAddress);
    },
    [startLiveStream]
  );

  const handleNewConversation = useCallback(() => {
    if (address) clearSession(address);
  }, [address, clearSession]);

  const hasActivity = hasSteps || !!claudeText || !!decision || !!swapDecision;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-10">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Payment Agent</h1>
          <p className="mt-1 text-sm text-gray-500">
            Describe any payment intent in plain language — the agent handles the rest.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* LEFT — main interaction panel */}
          <div className="flex flex-col gap-4 lg:col-span-2">

            {/* Wallet not connected — onboarding card */}
            {!address && (
              <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/50 p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 text-2xl">
                  🔗
                </div>
                <h2 className="mb-2 text-base font-semibold text-white">Connect your wallet to start</h2>
                <p className="mb-6 text-sm text-gray-500">
                  PayAgent needs your wallet address to scan balances and build transactions.
                </p>
                <div className="mb-6 flex flex-col gap-2 text-left">
                  {STEPS_GUIDE.map((s) => (
                    <div key={s.title} className="flex items-start gap-3 rounded-xl bg-gray-800/60 px-4 py-3">
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{s.title}</p>
                        <p className="text-xs text-gray-500">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600">
                  Your keys never leave MetaMask. The agent only builds unsigned transactions.
                </p>
              </div>
            )}

            {/* Wallet connected — balance + input */}
            {address && (
              <>
                <BalanceDisplay address={address} />

                {/* Input area */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-600">
                    Payment Intent
                  </p>
                  <div className="flex items-center gap-3">
                    <ChatInput
                      onSubmit={handleSubmit}
                      isLoading={isStreaming}
                      externalValue={inputValue}
                      onExternalValueChange={setInputValue}
                    />
                    {hasActivity && !isStreaming && (
                      <button
                        type="button"
                        className="whitespace-nowrap rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-400 transition hover:border-gray-600 hover:text-white"
                        onClick={handleNewConversation}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Example chips — hide once agent has started */}
                  {!hasActivity && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs text-gray-600">Try an example:</p>
                      <div className="flex flex-wrap gap-2">
                        {EXAMPLES.map((ex) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => setInputValue(ex)}
                            className="rounded-full border border-gray-700 bg-gray-800/60 px-3 py-1 text-xs text-gray-400 transition hover:border-violet-500/50 hover:text-violet-300"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Agent output */}
                {streamError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {streamError}
                  </div>
                )}
                {(hasSteps || claudeText) && (
                  <AgentSteps steps={steps} claudeText={claudeText} />
                )}
                {decision && <DecisionCard decision={decision} />}
                {swapDecision && <SwapDecisionCard decision={swapDecision} />}
              </>
            )}
          </div>

          {/* RIGHT — how it works sidebar */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-violet-400">
                How It Works
              </p>
              <ol className="flex flex-col gap-4">
                {STEPS_GUIDE.map((s, i) => (
                  <li key={s.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-xs font-bold text-gray-400">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{s.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-600">
                Supported Chains
              </p>
              <div className="flex flex-wrap gap-2">
                {["Ethereum", "Arbitrum", "Optimism", "Base", "Polygon", "Sepolia (Testnet)"].map((c) => (
                  <span key={c} className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-400">
                    {c}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-gray-600">
                Supported Tokens
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-400">USDT</span>
                <span className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-400">ETH</span>
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-400">
                  ETH ↔ USDT via Uniswap
                </span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
