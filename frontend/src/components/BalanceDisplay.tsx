import { useBalances } from "../hooks/useBalances";

const CHAIN_LABEL: Record<string, string> = {
  ethereum: "Ethereum",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  base: "Base",
  polygon: "Polygon",
};

interface Props {
  address: `0x${string}`;
}

export function BalanceDisplay({ address }: Props) {
  const { data, loading, error } = useBalances(address);

  if (loading) return <p className="text-sm text-gray-500">Loading balances…</p>;
  if (error) return <p className="text-sm text-red-400">Failed to load balances: {error}</p>;
  if (!data)   return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 bg-violet-500/10 px-4 py-3">
        <span className="text-sm text-gray-400">Total USDT</span>
        <span className="text-base font-semibold text-white">{data.totalUSDT} USDT</span>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-gray-800 bg-gray-800/50 px-4 py-2 text-left text-xs font-medium text-gray-500">Chain</th>
            <th className="border-b border-gray-800 bg-gray-800/50 px-4 py-2 text-left text-xs font-medium text-gray-500">USDT</th>
            <th className="border-b border-gray-800 bg-gray-800/50 px-4 py-2 text-left text-xs font-medium text-gray-500">ETH</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.balances).map(([chain, bal]) => (
            <tr key={chain} className="border-b border-gray-800/60 last:border-b-0 hover:bg-gray-800/30 transition">
              <td className={`px-4 py-2.5 ${bal.hasError ? "italic text-gray-600" : "text-gray-300"}`}>{CHAIN_LABEL[chain] ?? chain}</td>
              <td className={`px-4 py-2.5 ${bal.hasError ? "italic text-gray-600" : "text-gray-300"}`}>
                {bal.hasError ? "—" : Number(bal.usdt).toFixed(2)}
              </td>
              <td className={`px-4 py-2.5 ${bal.hasError ? "italic text-gray-600" : "text-gray-300"}`}>
                {bal.hasError ? "—" : Number(bal.eth).toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
