import { useState, useCallback, useRef, useEffect } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentValue = externalValue ?? message;

  const handleChange = (val: string) => {
    setMessage(val);
    onExternalValueChange?.(val);
  };

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [currentValue]);

  const handleSubmit = useCallback(() => {
    if (!currentValue.trim() || isLoading || !address) return;
    onSubmit(currentValue.trim(), address);
    setMessage("");
    onExternalValueChange?.("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [currentValue, isLoading, address, onSubmit, onExternalValueChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const placeholder = !isConnected
    ? "Connect your wallet first…"
    : isLoading
    ? "Agent is thinking…"
    : "Describe your payment — e.g. send 50 USDT to alice.eth";

  const canSend = isConnected && !isLoading && !!currentValue.trim();

  return (
    <div
      className={`relative rounded-2xl border bg-gray-900 px-4 pt-3.5 pb-12 transition-all ${
        isConnected && !isLoading
          ? "border-gray-700 focus-within:border-violet-500/60 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]"
          : "border-gray-800 opacity-60"
      }`}
    >
      <textarea
        ref={textareaRef}
        className="w-full resize-none bg-transparent text-sm leading-relaxed text-gray-200 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed"
        rows={1}
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={!isConnected || isLoading}
      />

      {/* Bottom row */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        {!isLoading && (
          <p className="select-none text-xs text-gray-600">
            Shift+↵ to send
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
            canSend
              ? "bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.35)]"
              : "bg-gray-800 text-gray-600 cursor-not-allowed"
          }`}
          aria-label="Send"
        >
          {isLoading ? (
            <span className="h-3 w-3 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
