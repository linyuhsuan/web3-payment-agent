import { ConnectKitButton } from "connectkit";
import { useConnection } from "wagmi";

export function WalletConnect() {
  const { address, isConnected } = useConnection();

  return (
    <div className="wallet-connect">
      <ConnectKitButton />
      {isConnected && address && (
        <p className="wallet-address">
          {address.slice(0, 6)}…{address.slice(-4)}
        </p>
      )}
    </div>
  );
}
