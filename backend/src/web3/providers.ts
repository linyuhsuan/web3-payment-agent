import { createPublicClient, http, fallback } from "viem";
import { mainnet, arbitrum, optimism, base, polygon, sepolia } from "viem/chains";
import type { SupportedChain } from "./constants";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

function alchemyUrl(network: string): string {
  return `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
}

const PUBLIC_RPC: Record<SupportedChain, string> = {
  ethereum: "https://cloudflare-eth.com",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
  base: "https://mainnet.base.org",
  polygon: "https://polygon-bor-rpc.publicnode.com",
  sepolia: "https://ethereum-sepolia-rpc.publicnode.com",
};

function chainTransport(chain: SupportedChain, alchemyNetwork: string) {
  const publicTransport = http(PUBLIC_RPC[chain]);
  if (!ALCHEMY_API_KEY) return publicTransport;
  return fallback([http(alchemyUrl(alchemyNetwork)), publicTransport]);
}

// Lazy singletons — created on first access
let _clients: ReturnType<typeof buildClients> | null = null;

function buildClients() {
  return {
    ethereum: createPublicClient({ chain: mainnet,  transport: chainTransport("ethereum", "eth-mainnet") }),
    arbitrum: createPublicClient({ chain: arbitrum, transport: chainTransport("arbitrum", "arb-mainnet") }),
    optimism: createPublicClient({ chain: optimism, transport: chainTransport("optimism", "opt-mainnet") }),
    base:     createPublicClient({ chain: base,     transport: chainTransport("base",     "base-mainnet") }),
    polygon:  createPublicClient({ chain: polygon,  transport: chainTransport("polygon",  "polygon-mainnet") }),
    sepolia:  createPublicClient({ chain: sepolia,  transport: chainTransport("sepolia",  "eth-sepolia") }),
  };
}

export function getClients() {
  if (!_clients) _clients = buildClients();
  return _clients;
}

export function getClient(chain: SupportedChain) {
  return getClients()[chain];
}

export const CHAIN_IDS: Record<SupportedChain, number> = {
  ethereum: mainnet.id,
  arbitrum: arbitrum.id,
  optimism: optimism.id,
  base:     base.id,
  polygon:  polygon.id,
  sepolia:  sepolia.id,
};
