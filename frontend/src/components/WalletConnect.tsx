import { ConnectKitButton } from "connectkit";
// import { useAccount } from "wagmi";

export function WalletConnect() {
  // const { address, isConnected } = useAccount();

  return (
    <div className="flex items-center gap-2">
      <ConnectKitButton />
      {/* {isConnected && address && (
        <p className="wallet-address">
          {address.slice(0, 6)}…{address.slice(-4)}
        </p>
      )} */}
    </div>
  );
}
