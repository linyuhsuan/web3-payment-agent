import { useState, useRef, useCallback } from "react";
import { useConnection } from "wagmi";

interface ChatInputProps {
  onSubmit: (message: string, walletAddress: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSubmit, isLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const { address, isConnected } = useConnection();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!message.trim() || isLoading || !address) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSubmit(message.trim(), address);
        setMessage("");
      }, 500);
    },
    [message, isLoading, address, onSubmit]
  );

  const placeholder = !isConnected
    ? "Connect your wallet first…"
    : isLoading
    ? "Agent is thinking…"
    : "e.g. send 50 USDT to alice.eth";

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <input
        className="chat-input"
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        disabled={!isConnected || isLoading}
      />
      <button
        className="chat-submit"
        type="submit"
        disabled={!isConnected || isLoading || !message.trim()}
      >
        {isLoading ? "…" : "Send"}
      </button>
    </form>
  );
}
