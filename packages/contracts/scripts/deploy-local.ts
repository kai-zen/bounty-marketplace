/**
 * Deploys MarketplaceModule to hardhatMainnet and writes
 * `deployments/<chainId>.json` (see `deployments/schema.json`).
 *
 * The simulated chain is discarded when the process exits. The manifest is the
 * committed record of those addresses for the web app and API.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { network } from "hardhat";

import MarketplaceModule from "../ignition/modules/Marketplace.js";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const connection = await network.create("hardhatMainnet");

try {
  const { factory, registry } =
    await connection.ignition.deploy(MarketplaceModule);
  const chainId = Number(
    await connection.provider.request({ method: "eth_chainId" }),
  );
  const feeRecipient = await factory.read.feeRecipient();

  const manifest = {
    chainId,
    factory: factory.address,
    registry: registry.address,
    feeRecipient,
    deployedAt: new Date().toISOString(),
  };

  assertManifest(manifest);

  const outDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../deployments",
  );
  const outPath = path.join(outDir, `${manifest.chainId}.json`);
  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`wrote deployments/${manifest.chainId}.json`);
  console.log(`  factory      ${manifest.factory}`);
  console.log(`  registry     ${manifest.registry}`);
  console.log(`  feeRecipient ${manifest.feeRecipient}`);
} finally {
  await connection.close();
}

function assertManifest(manifest: {
  chainId: number;
  factory: string;
  registry: string;
  feeRecipient: string;
  deployedAt: string;
}): void {
  if (!Number.isInteger(manifest.chainId) || manifest.chainId < 1) {
    throw new Error(`Invalid chainId: ${manifest.chainId}`);
  }

  for (const field of ["factory", "registry", "feeRecipient"] as const) {
    if (!ADDRESS_RE.test(manifest[field])) {
      throw new Error(`Invalid ${field}: ${manifest[field]}`);
    }
  }

  if (Number.isNaN(Date.parse(manifest.deployedAt))) {
    throw new Error(`Invalid deployedAt: ${manifest.deployedAt}`);
  }
}
