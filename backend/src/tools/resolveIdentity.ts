import { isAddress, getAddress, zeroAddress } from "viem";
import { normalize } from "viem/ens";
import { getClient } from "../web3/providers";

export interface ResolveIdentityResult {
  address: `0x${string}`;
  displayName: string;
  resolvedVia: "ens" | "direct";
  warning?: string;
}

export async function resolveIdentity(
  identifier: string
): Promise<ResolveIdentityResult> {
  const trimmed = identifier.trim();

  if (isAddress(trimmed)) {
    return {
      address: getAddress(trimmed) as `0x${string}`,
      displayName: trimmed,
      resolvedVia: "direct",
    };
  }

  if (!trimmed.endsWith(".eth")) {
    throw { code: "ENS_NOT_FOUND", message: `"${trimmed}" is not a valid address or ENS name` };
  }

  let normalized: string;
  try {
    normalized = normalize(trimmed);
  } catch {
    throw { code: "ENS_NOT_FOUND", message: `"${trimmed}" is not a valid ENS name` };
  }

  const client = getClient("ethereum");
  let address: `0x${string}` | null = null;

  try {
    address = await client.getEnsAddress({ name: normalized });
  } catch {
    throw { code: "ENS_NOT_FOUND", message: `ENS name "${trimmed}" could not be resolved` };
  }

  if (!address) {
    throw { code: "ENS_NO_ADDRESS", message: `ENS name "${trimmed}" exists but has no ETH address` };
  }

  if (address === zeroAddress) {
    throw { code: "ENS_NO_ADDRESS", message: `ENS name "${trimmed}" resolves to the zero address` };
  }

  const result: ResolveIdentityResult = {
    address: getAddress(address) as `0x${string}`,
    displayName: trimmed,
    resolvedVia: "ens",
  };

  return result;
}
