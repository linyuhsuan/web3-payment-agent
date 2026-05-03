import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Navbar } from "../components/layout/Navbar";
import { WalletGate } from "../components/wallet/WalletGate";
import { EmptyChat } from "../components/chat/EmptyChat";
import { TurnMessage } from "../components/chat/TurnMessage";
import { ChatBar } from "../components/chat/ChatBar";
import { useAgentStream } from "../hooks/useAgentStream";
import type { AgentDecision, AgentStep, AgentSwapDecision } from "../hooks/useAgentStream";

interface Turn {
  id: string;
  userText: string;
  agentSteps: AgentStep[];
  agentText: string;
  decision: AgentDecision | null;
  swapDecision: AgentSwapDecision | null;
  error: string | null;
}

export default function AppPage() {
  const { address } = useAccount();
  const { steps, geminiText, decision, swapDecision, isStreaming, streamError, startLiveStream, clearSession } =
    useAgentStream();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevIsStreamingRef = useRef(false);

  // Snapshot hook state into the last turn only when streaming completes
  useEffect(() => {
    if (prevIsStreamingRef.current && !isStreaming) {
      setTurns((prev) => {
        if (prev.length === 0) return prev;
        return prev.map((t, i) =>
          i === prev.length - 1
            ? { ...t, agentSteps: steps, agentText: geminiText, decision, swapDecision, error: streamError }
            : t
        );
      });
    }
    prevIsStreamingRef.current = isStreaming;
  }, [isStreaming, steps, geminiText, decision, swapDecision, streamError]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isStreaming]);

  const handleSubmit = useCallback(
    async (message: string, walletAddress: string) => {
      setTurns((prev) => [
        ...prev,
        { id: `turn-${Date.now()}`, userText: message, agentSteps: [], agentText: "", decision: null, swapDecision: null, error: null },
      ]);
      await startLiveStream(message, walletAddress);
    },
    [startLiveStream]
  );

  const prevAddressRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const prev = prevAddressRef.current;
    prevAddressRef.current = address;
    if (prev && !address) {
      clearSession(prev);
      setTurns([]);
      setInputValue("");
    }
  }, [address, clearSession]);

  const handleClear = useCallback(() => {
    if (address) clearSession(address);
    setTurns([]);
    setInputValue("");
  }, [address, clearSession]);

  const hasTurns = turns.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <Navbar />
      {!address && <WalletGate />}
      {address && !hasTurns && (
        <EmptyChat
          isLoading={isStreaming}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
        />
      )}
      {address && hasTurns && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-2xl flex flex-col gap-6">
              {turns.map((turn, i) => {
                const isLiveTurn = i === turns.length - 1 && isStreaming;
                return (
                  <TurnMessage
                    key={turn.id}
                    userText={turn.userText}
                    steps={isLiveTurn ? steps : turn.agentSteps}
                    agentText={isLiveTurn ? geminiText : turn.agentText}
                    decision={isLiveTurn ? decision : turn.decision}
                    swapDecision={isLiveTurn ? swapDecision : turn.swapDecision}
                    error={isLiveTurn ? streamError : turn.error}
                    isStreaming={isLiveTurn}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <ChatBar
            isLoading={isStreaming}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSubmit={handleSubmit}
            onClear={handleClear}
          />
        </>
      )}
    </div>
  );
}
