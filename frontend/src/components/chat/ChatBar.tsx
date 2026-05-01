import { ChatInput } from "./ChatInput";

interface ChatBarProps {
  isLoading: boolean;
  inputValue: string;
  onInputChange: (val: string) => void;
  onSubmit: (message: string, walletAddress: string) => void;
  onClear: () => void;
}

export function ChatBar({ isLoading, inputValue, onInputChange, onSubmit, onClear }: ChatBarProps) {
  return (
    <div className="bg-gray-950 px-4 py-4">
      <div className="mx-auto max-w-2xl flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <ChatInput
            onSubmit={onSubmit}
            isLoading={isLoading}
            externalValue={inputValue}
            onExternalValueChange={onInputChange}
          />
        </div>
        <button
          type="button"
          className={`whitespace-nowrap rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-400 transition hover:border-gray-600 hover:text-white ${isLoading ? "invisible" : ""}`}
          onClick={onClear}
          tabIndex={isLoading ? -1 : 0}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
