/**
 * Writes JSON ABIs for BountyFactory, BountyEscrow, and SubmissionRegistry to `abis/`.
 *
 * Those files are committed so the API and web app can import them without a
 * Solidity compile. Full Hardhat artifacts under `artifacts/` stay gitignored.
 * `pnpm compile` runs this after `hardhat compile`; `pnpm export-abis` compiles
 * if needed, then writes the same files.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { artifacts } from "hardhat";

const CONTRACTS = [
  "BountyFactory",
  "BountyEscrow",
  "SubmissionRegistry",
] as const;

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outDir = path.join(packageRoot, "abis");

await mkdir(outDir, { recursive: true });

for (const name of CONTRACTS) {
  const { abi } = await artifacts.readArtifact(name);
  const outPath = path.join(outDir, `${name}.json`);
  await writeFile(outPath, `${JSON.stringify(abi, null, 2)}\n`);
  console.log(`exported ${name} -> abis/${name}.json`);
}
