import { createConfig, http, fallback } from "wagmi";
import { mainnet, arbitrum, optimism, base, polygon, sepolia } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

const key = import.meta.env.VITE_ALCHEMY_API_KEY;

function alchemy(network: string) {
  return http(`https://${network}.g.alchemy.com/v2/${key}`);
}

// Public CORS-friendly RPCs as fallback when Alchemy key is missing or network not enabled
const PUBLIC_RPC: Record<number, string> = {
  [mainnet.id]:  "https://cloudflare-eth.com",
  [arbitrum.id]: "https://arb1.arbitrum.io/rpc",
  [optimism.id]: "https://mainnet.optimism.io",
  [base.id]:     "https://mainnet.base.org",
  [polygon.id]:  "https://polygon-bor-rpc.publicnode.com",
  [sepolia.id]:  "https://ethereum-sepolia-rpc.publicnode.com",
};

function transport(chainId: number, network: string) {
  const publicRpc = http(PUBLIC_RPC[chainId]);
  if (!key) return publicRpc;
  return fallback([alchemy(network), publicRpc]);
}

export const config = createConfig(
  getDefaultConfig({
    chains: [mainnet, arbitrum, optimism, base, polygon, sepolia],
    transports: {
      [mainnet.id]:   transport(mainnet.id,   "eth-mainnet"),
      [arbitrum.id]:  transport(arbitrum.id,  "arb-mainnet"),
      [optimism.id]:  transport(optimism.id,  "opt-mainnet"),
      [base.id]:      transport(base.id,      "base-mainnet"),
      [polygon.id]:   transport(polygon.id,   "polygon-mainnet"),
      [sepolia.id]:   transport(sepolia.id,   "eth-sepolia"),
    },
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "",
    appName: "Web3 AI Payment Agent",
    appDescription: "Send USDT cross-chain with AI assistance",
  })
);
