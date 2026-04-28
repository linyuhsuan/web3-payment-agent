import { useState, useRef, useCallback, useEffect } from "react";
import { useConnection } from "wagmi";

interface ChatInputProps {
  onSubmit: (message: string, walletAddress: string) => void;
  isLoading?: boolean;
  externalValue?: string;
  onExternalValueChange?: (val: string) => void;
}

export function ChatInput({
  onSubmit,
  isLoading = false,
  externalValue,
  onExternalValueChange,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const { address, isConnected } = useConnection();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // sync external value (e.g. from example chips) into local state
  useEffect(() => {
    if (externalValue !== undefined) setMessage(externalValue);
  }, [externalValue]);

  const handleChange = (val: string) => {
    setMessage(val);
    onExternalValueChange?.(val);
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!message.trim() || isLoading || !address) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSubmit(message.trim(), address);
        setMessage("");
        onExternalValueChange?.("");
      }, 500);
    },
    [message, isLoading, address, onSubmit, onExternalValueChange]
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
        value={message}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={!isConnected || isLoading}
      />
      <button
        className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_12px_rgba(139,92,246,0.25)]"
        type="submit"
        disabled={!isConnected || isLoading || !message.trim()}
      >
        {isLoading ? "…" : "Send"}
      </button>
    </form>
  );
}
