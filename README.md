# Web3 Bounty Marketplace

A decentralized bounty marketplace where creators can fund tasks with ETH, and contributors can submit work to claim rewards. Built as a full-stack Web3 monorepo.

## Current status

Smart contracts in `packages/contracts` are complete. The API, indexer, and web UI are in progress.

## Docs

- [Local development](docs/LOCAL_DEVELOPMENT.md) — MongoDB, contract deploy, env files, and `pnpm dev`.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) — full build roadmap.

## Architecture Overview

The platform strictly separates on-chain trust/money logic from off-chain indexing/metadata.

1. **Frontend (`apps/web`)**: Next.js app for browsing, creating, and managing bounties.
2. **Backend (`apps/api`)**: NestJS backend for metadata storage and blockchain event indexing.
3. **Smart Contracts (`packages/contracts`)**: Hardhat project managing ETH escrow, submission proofs, and payouts.

## Monorepo Structure

- `apps/api`: NestJS + Mongoose (Indexer & API)
- `apps/web`: Next.js + MUI + Viem + Wagmi (Frontend UI)
- `packages/contracts`: Hardhat + Solidity (Smart Contracts)
- `packages/types`: Shared TypeScript interfaces
- `packages/ui`: Shared MUI components

## System Flow

1. **Create Bounty:** Frontend sends metadata to API $\rightarrow$ API returns URI $\rightarrow$ Wallet calls `Factory.createBounty()` $\rightarrow$ API Indexer syncs data.
2. **Submit Work:** Frontend sends metadata to API $\rightarrow$ API returns URI $\rightarrow$ Wallet calls `Registry.submitWork()` $\rightarrow$ API Indexer syncs data.
3. **Award & Pay:** Creator calls `Escrow.awardWinner()` $\rightarrow$ Winner calls `Escrow.claimReward()`.
