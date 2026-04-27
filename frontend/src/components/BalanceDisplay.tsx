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
  if (error) return <p className="text-sm text-red-500">Failed to load balances: {error}</p>;
  if (!data)   return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 bg-violet-50 px-4 py-3">
        <span className="text-sm text-gray-600">Total USDT</span>
        <span className="text-base font-semibold text-gray-900">{data.totalUSDT} USDT</span>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-left text-xs font-medium text-gray-500">Chain</th>
            <th className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-left text-xs font-medium text-gray-500">USDT</th>
            <th className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-left text-xs font-medium text-gray-500">ETH</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.balances).map(([chain, bal]) => (
            <tr key={chain} className="border-b border-gray-100 last:border-b-0">
              <td className={`px-4 py-2 ${bal.hasError ? "italic text-gray-500" : "text-gray-900"}`}>{CHAIN_LABEL[chain] ?? chain}</td>
              <td className={`px-4 py-2 ${bal.hasError ? "italic text-gray-500" : "text-gray-900"}`}>
                {bal.hasError ? "—" : Number(bal.usdt).toFixed(2)}
              </td>
              <td className={`px-4 py-2 ${bal.hasError ? "italic text-gray-500" : "text-gray-900"}`}>
                {bal.hasError ? "—" : Number(bal.eth).toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
