import { useCallback } from "react";
import { useAccount } from "wagmi";
import { WalletConnect } from "./components/WalletConnect";
import { ChatInput } from "./components/ChatInput";
import { BalanceDisplay } from "./components/BalanceDisplay";
import { AgentSteps } from "./components/AgentSteps";
import { DecisionCard } from "./components/DecisionCard";
import { useAgentStream } from "./hooks/useAgentStream";

function App() {
  const { address } = useAccount();
  const { steps, claudeText, decision, hasSteps, isStreaming, startLiveStream, clearSession } =
    useAgentStream();

  const handleSubmit = useCallback(
    async (message: string, walletAddress: string) => {
      await startLiveStream(message, walletAddress);
    },
    [startLiveStream]
  );

  const handleNewConversation = useCallback(() => {
    if (address) clearSession(address);
  }, [address, clearSession]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-5">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 py-5">
        <h1 className="m-0 text-3xl font-semibold text-gray-950">Web3 AI Payment Agent</h1>
        <WalletConnect />
      </header>
      <main className="flex flex-col gap-4 py-6">
        {address && <BalanceDisplay address={address} />}
        <div className="flex items-center gap-3">
          <ChatInput onSubmit={handleSubmit} isLoading={isStreaming} />
          {(hasSteps || claudeText) && !isStreaming && (
            <button
              type="button"
              className="whitespace-nowrap rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
              onClick={handleNewConversation}
            >
              New conversation
            </button>
          )}
        </div>
        {(hasSteps || claudeText) && <AgentSteps steps={steps} claudeText={claudeText} />}
        {decision && <DecisionCard decision={decision} />}
      </main>
    </div>
  );
}

export default App;
