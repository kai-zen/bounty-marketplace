# Web3 Bounty Marketplace - Smart Contracts

Hardhat project containing the core Solidity smart contracts managing funds, state, and trust.

## Contracts

- **BountyFactory:**
  Creates and tracks individual `BountyEscrow` contracts.
  Manages global platform fee configurations.

- **BountyEscrow:**
  Holds ETH for a specific bounty.
  Handles the lifecycle: awarding the winner, allowing the winner to claim the reward (minus platform fees), or allowing the creator to refund if the deadline passes.

- **SubmissionRegistry:**
  Stores lightweight on-chain proofs of submissions (linking a bounty address, a submitter address, and a metadata URI).

## ABI export

`pnpm compile` compiles the contracts, then writes JSON ABIs to `packages/contracts/abis/`:

- `abis/BountyFactory.json`
- `abis/BountyEscrow.json`
- `abis/SubmissionRegistry.json`

`pnpm export-abis` does the same write. It compiles first when artifacts are missing or stale.

**These ABI files are committed.** They are the interface the API and web app import, so a checkout can use them without Hardhat. When a contract interface changes, run `pnpm compile` from the repo root (or `pnpm --filter contracts export-abis`) and commit the updated JSON. Full compiler output under `artifacts/` (bytecode, build info, tests) stays gitignored.

## Local deploy

`ignition/modules/Marketplace.ts` deploys `SubmissionRegistry`, then `BountyFactory` with that registry, a fee recipient, and a platform fee.

```bash
pnpm --filter contracts deploy:local
```

The command targets the `hardhatMainnet` simulated network. The fee recipient is `FEE_RECIPIENT` when that env var is set, and Hardhat account #1 otherwise (account #0 deploys and owns the factory). The platform fee defaults to 250 bps. Both values are Ignition parameters (`feeRecipient`, `platformFeeBps`), so a parameters file overrides those defaults.

## Core Trust Principles

- **Funds are non-custodial:** ETH is locked in individual Escrow contracts.
- **Metadata is off-chain:** The contracts only store URIs (`metadataURI`, `submissionURI`) to keep gas costs low.
