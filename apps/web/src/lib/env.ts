import type { Address } from "@bounty/types";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export type WebPublicEnv = {
  apiUrl: string;
  chainId: number;
  rpcUrl: string;
  factoryAddress: Address;
  registryAddress: Address;
  sepoliaRpcUrl?: string;
};

export class WebEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebEnvError";
  }
}

function requireNonEmpty(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new WebEnvError(`${name} is required (see apps/web/.env.example).`);
  }
  return trimmed;
}

function requireAddress(name: string, value: string | undefined): Address {
  const trimmed = requireNonEmpty(name, value);
  if (!EVM_ADDRESS.test(trimmed)) {
    throw new WebEnvError(`${name} must be a 0x-prefixed 20-byte hex address.`);
  }
  return trimmed.toLowerCase() as Address;
}

function requireChainId(value: string | undefined): number {
  const raw = requireNonEmpty("NEXT_PUBLIC_CHAIN_ID", value);
  const chainId = Number(raw);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new WebEnvError("NEXT_PUBLIC_CHAIN_ID must be a positive integer.");
  }
  return chainId;
}

function requireHttpUrl(name: string, value: string | undefined): string {
  const trimmed = requireNonEmpty(name, value);
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new WebEnvError(`${name} must use http or https.`);
    }
    return trimmed.replace(/\/$/, "");
  } catch {
    throw new WebEnvError(`${name} must be a valid URL.`);
  }
}

let cachedEnv: WebPublicEnv | undefined;

/** Validated `NEXT_PUBLIC_*` config for browser and server fetch helpers. */
export function getWebEnv(): WebPublicEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const sepoliaRaw = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL?.trim();

  cachedEnv = {
    apiUrl: requireHttpUrl(
      "NEXT_PUBLIC_API_URL",
      process.env.NEXT_PUBLIC_API_URL,
    ),
    chainId: requireChainId(process.env.NEXT_PUBLIC_CHAIN_ID),
    rpcUrl: requireHttpUrl(
      "NEXT_PUBLIC_RPC_URL",
      process.env.NEXT_PUBLIC_RPC_URL,
    ),
    factoryAddress: requireAddress(
      "NEXT_PUBLIC_FACTORY_ADDRESS",
      process.env.NEXT_PUBLIC_FACTORY_ADDRESS,
    ),
    registryAddress: requireAddress(
      "NEXT_PUBLIC_REGISTRY_ADDRESS",
      process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
    ),
    ...(sepoliaRaw ? { sepoliaRpcUrl: sepoliaRaw } : {}),
  };

  return cachedEnv;
}

/** Clears cached env (useful in tests). */
export function resetWebEnvCache(): void {
  cachedEnv = undefined;
}
