import { useBalances } from "../hooks/useBalances";

const CHAIN_LABEL: Record<string, string> = {
  ethereum: "Ethereum",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  base: "Base",
  polygon: "Polygon",
};

interface Props {
  address: string;
}

export function BalanceDisplay({ address }: Props) {
  const { data, loading, error } = useBalances(address);

  if (loading) return <p className="balance-status">Loading balances…</p>;
  if (error)   return <p className="balance-status error">Failed to load balances: {error}</p>;
  if (!data)   return null;

  return (
    <div className="balance-display">
      <div className="balance-summary">
        <span className="balance-total-label">Total USDT</span>
        <span className="balance-total-value">{data.totalUSDT} USDT</span>
      </div>
      <table className="balance-table">
        <thead>
          <tr>
            <th>Chain</th>
            <th>USDT</th>
            <th>ETH</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.balances).map(([chain, bal]) => (
            <tr key={chain} className={bal.hasError ? "row-error" : ""}>
              <td>{CHAIN_LABEL[chain] ?? chain}</td>
              <td>{bal.hasError ? "—" : Number(bal.usdt).toFixed(2)}</td>
              <td>{bal.hasError ? "—" : Number(bal.eth).toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
