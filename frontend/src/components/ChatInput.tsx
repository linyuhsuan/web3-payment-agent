import { useState, useCallback } from "react";
import { useAccount } from "wagmi";

interface ChatInputProps {
  onSubmit: (message: string, walletAddress: string) => void;
  isLoading?: boolean;
  externalValue?: string;
  onExternalValueChange?: (value: string) => void;
}

export function ChatInput({
  onSubmit,
  isLoading = false,
  externalValue,
  onExternalValueChange,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const { address, isConnected } = useAccount();

  const currentValue = externalValue ?? message;

  const handleChange = (val: string) => {
    setMessage(val);
    onExternalValueChange?.(val);
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentValue.trim() || isLoading || !address) return;
      onSubmit(currentValue.trim(), address);
      setMessage("");
      onExternalValueChange?.("");
    },
    [currentValue, isLoading, address, onSubmit, onExternalValueChange]
  );

  const placeholder = !isConnected
    ? "Connect your wallet first…"
    : isLoading
    ? "Agent is thinking…"
    : 'e.g. "send 50 USDT to alice.eth"';

  return (
    <form className="flex flex-1 gap-2" onSubmit={handleSubmit}>
      <input
        className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50 transition"
        type="text"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={!isConnected || isLoading}
      />
      <button
        className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_12px_rgba(139,92,246,0.25)]"
        type="submit"
        disabled={!isConnected || isLoading || !currentValue.trim()}
      >
        {isLoading ? "…" : "Send"}
      </button>
    </form>
  );
}
