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
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <input
        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        disabled={!isConnected || isLoading}
      />
      <button
        className="rounded-lg bg-violet-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        disabled={!isConnected || isLoading || !message.trim()}
      >
        {isLoading ? "…" : "Send"}
      </button>
    </form>
  );
}
