const STEPS_GUIDE = [
  { icon: "🔗", title: "Connect Wallet", desc: "Click \"Connect Wallet\" in the top right to link any compatible wallet." },
  { icon: "💬", title: "Type your intent", desc: "Describe your payment naturally — recipient, amount, token." },
  { icon: "🤖", title: "Agent reasons", desc: "AI resolves ENS, scans 5 chains, picks the optimal path automatically." },
  { icon: "✍️", title: "Confirm in wallet", desc: "Review the decision card, then approve the transaction in your wallet." },
];

export function WalletGate() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-dashed border-gray-700 bg-gray-900/50 p-8 text-center">
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
          Your keys never leave your wallet. The agent only builds unsigned transactions.
        </p>
      </div>
    </div>
  );
}
