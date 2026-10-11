/**
 * Wagmi ABIs and deployment addresses for the web app.
 *
 * ```ts
 * import { bountyFactoryAbi, getDeployment } from "@bounty/types/contracts";
 *
 * const { factory } = getDeployment(31337);
 * useReadContract({ address: factory, abi: bountyFactoryAbi, functionName: "bountyCount" });
 * ```
 */
import type { Address } from "./index";

import localDeploymentJson from "../contracts/deployments/31337.json" with { type: "json" };

export type { Address };
export { bountyFactoryAbi } from "../contracts/abis/BountyFactory";
export { bountyEscrowAbi } from "../contracts/abis/BountyEscrow";
export { submissionRegistryAbi } from "../contracts/abis/SubmissionRegistry";

/**
 * `packages/contracts/deployments/<chainId>.json`.
 * Matches `packages/contracts/deployments/schema.json`.
 */
export interface DeploymentManifest {
  chainId: number;
  factory: Address;
  registry: Address;
  feeRecipient: Address;
  /** ISO-8601 UTC timestamp. */
  deployedAt: string;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Local Hardhat sample, plus any later chain manifests registered below. */
export const deployments = {
  31337: parseDeploymentManifest(localDeploymentJson),
} as const;

export function getDeployment(chainId: number): DeploymentManifest {
  const manifest = deployments[chainId as keyof typeof deployments];
  if (manifest === undefined || manifest.chainId !== chainId) {
    throw new Error(
      `No deployment manifest for chain ${chainId}. Add packages/contracts/deployments/${chainId}.json and register it in @bounty/types/contracts.`,
    );
  }
  return manifest;
}

function parseDeploymentManifest(value: {
  chainId: number;
  factory: string;
  registry: string;
  feeRecipient: string;
  deployedAt: string;
}): DeploymentManifest {
  if (!Number.isInteger(value.chainId) || value.chainId < 1) {
    throw new Error(`Invalid chainId in deployment manifest: ${value.chainId}`);
  }

  return {
    chainId: value.chainId,
    factory: asAddress(value.factory, "factory"),
    registry: asAddress(value.registry, "registry"),
    feeRecipient: asAddress(value.feeRecipient, "feeRecipient"),
    deployedAt: value.deployedAt,
  };
}

function asAddress(value: string, field: string): Address {
  if (!ADDRESS_RE.test(value)) {
    throw new Error(`Invalid ${field} in deployment manifest: ${value}`);
  }
  return value as Address;
}
