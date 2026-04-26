import { createPublicClient, http } from "viem";
import { mainnet, arbitrum, optimism, base, polygon } from "viem/chains";
import type { SupportedChain } from "./constants";

function alchemyUrl(network: string): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("ALCHEMY_API_KEY is not set in .env");
  return `https://${network}.g.alchemy.com/v2/${key}`;
}

// Lazy singletons — created on first access so missing API key throws at call time, not import time
let _clients: ReturnType<typeof buildClients> | null = null;

function buildClients() {
  return {
    ethereum: createPublicClient({ chain: mainnet, transport: http(alchemyUrl("eth-mainnet")) }),
    arbitrum: createPublicClient({ chain: arbitrum, transport: http(alchemyUrl("arb-mainnet")) }),
    optimism: createPublicClient({ chain: optimism, transport: http(alchemyUrl("opt-mainnet")) }),
    base:     createPublicClient({ chain: base,     transport: http(alchemyUrl("base-mainnet")) }),
    polygon:  createPublicClient({ chain: polygon,  transport: http(alchemyUrl("polygon-mainnet")) }),
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
  base: base.id,
  polygon: polygon.id,
};
