import { ChatInput } from "./ChatInput";

const EXAMPLES = [
  "Send 50 USDT to alice.eth",
  "Send 0.01 ETH to vitalik.eth",
  "Pay alice.eth 100 USDT",
  "Transfer 0.005 ETH to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
];

const STEPS_GUIDE = [
  { icon: "🔗", title: "Connect Wallet", desc: "Click \"Connect Wallet\" in the top right to link any compatible wallet." },
  { icon: "💬", title: "Type your intent", desc: "Describe your payment naturally — recipient, amount, token." },
  { icon: "🤖", title: "Agent reasons", desc: "AI resolves ENS, scans 5 chains, picks the optimal path automatically." },
  { icon: "✍️", title: "Confirm in wallet", desc: "Review the decision card, then approve the transaction in your wallet." },
];

interface EmptyChatProps {
  isLoading: boolean;
  inputValue: string;
  onInputChange: (val: string) => void;
  onSubmit: (message: string, walletAddress: string) => void;
}

export function EmptyChat({ isLoading, inputValue, onInputChange, onSubmit }: EmptyChatProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">Payment Agent</h1>
        <p className="mt-2 text-sm text-gray-500">
          Describe any payment intent in plain language — the agent handles the rest.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <ChatInput
          onSubmit={onSubmit}
          isLoading={isLoading}
          externalValue={inputValue}
          onExternalValueChange={onInputChange}
        />

        <div className="mt-4">
          <p className="mb-2 text-center text-xs text-gray-600">Try an example:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => onInputChange(ex)}
                className="rounded-full border border-gray-700 bg-gray-800/60 px-3 py-1 text-xs text-gray-400 transition hover:border-violet-500/50 hover:text-violet-300"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-violet-400">
            How It Works
          </p>
          <ol className="flex flex-col gap-4">
            {STEPS_GUIDE.map((s, i) => (
              <li key={s.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-xs font-bold text-gray-400">
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
      </div>
    </div>
  );
}
