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

`pnpm compile` compiles the contracts, then writes ABIs to `packages/contracts/abis/`:

- `abis/BountyFactory.json` and `abis/BountyFactory.ts`
- `abis/BountyEscrow.json` and `abis/BountyEscrow.ts`
- `abis/SubmissionRegistry.json` and `abis/SubmissionRegistry.ts`

The `.ts` files are `as const` ABIs for wagmi. `pnpm export-abis` does the same write. It compiles first when artifacts are missing or stale.

**These ABI files are committed.** They are the interface the API and web app import, so a checkout can use them without Hardhat. When a contract interface changes, run `pnpm compile` from the repo root (or `pnpm --filter contracts export-abis`) and commit the updated files. Full compiler output under `artifacts/` (bytecode, build info, tests) stays gitignored.

## Local deploy

`ignition/modules/Marketplace.ts` deploys `SubmissionRegistry`, then `BountyFactory` with that registry, a fee recipient, and a platform fee.

```bash
pnpm --filter contracts deploy:local
```

The command targets the `hardhatMainnet` simulated network and writes `packages/contracts/deployments/<chainId>.json`. The fee recipient is `FEE_RECIPIENT` when that env var is set, and Hardhat account #1 otherwise (account #0 deploys and owns the factory). The platform fee defaults to 250 bps. Both values are Ignition parameters (`feeRecipient`, `platformFeeBps`), so a parameters file overrides those defaults.

## Deployment manifests

Web and API load addresses from one file per chain, relative to the repo root:

```text
packages/contracts/deployments/<chainId>.json
```

Local Hardhat is `packages/contracts/deployments/31337.json`. The JSON shape is `packages/contracts/deployments/schema.json`:

| Field          | Meaning                                          |
| -------------- | ------------------------------------------------ |
| `chainId`      | EVM chain id                                     |
| `factory`      | `BountyFactory` address                          |
| `registry`     | `SubmissionRegistry` address                     |
| `feeRecipient` | Platform fee recipient configured on the factory |
| `deployedAt`   | UTC timestamp written by the deploy script       |

These files hold addresses and a timestamp only. `31337.json` is the committed local sample. Another chain uses the same filename pattern, for example `11155111.json` for Sepolia.

The web app imports the ABIs and these addresses from `@bounty/types/contracts`.

## Core Trust Principles

- **Funds are non-custodial:** ETH is locked in individual Escrow contracts.
- **Metadata is off-chain:** The contracts only store URIs (`metadataURI`, `submissionURI`) to keep gas costs low.
