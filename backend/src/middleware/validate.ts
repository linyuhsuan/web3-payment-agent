import { isAddress } from "viem";
import { SUPPORTED_CHAINS, type SupportedChain } from "../web3/constants";
import { AppError } from "./errors";

export function requireAddress(value: unknown, label: string): `0x${string}` {
  if (typeof value !== "string" || !isAddress(value))
    throw new AppError(400, `Invalid ${label}`);
  return value as `0x${string}`;
}

export function requireChain(value: unknown): SupportedChain {
  if (!value || !SUPPORTED_CHAINS.includes(value as SupportedChain))
    throw new AppError(400, "Invalid chain");
  return value as SupportedChain;
}

export function requirePositiveNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || value <= 0)
    throw new AppError(400, `Invalid ${label}`);
  return value;
}
