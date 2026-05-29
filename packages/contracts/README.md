# Web3 Bounty Marketplace - Smart Contracts

Hardhat project containing the core Solidity smart contracts managing funds, state, and trust.

## Contracts

- **BountyFactory:** Creates and tracks individual `BountyEscrow` contracts. Manages global platform fee configurations.
- **BountyEscrow:** Holds ETH for a specific bounty. Handles the lifecycle: awarding the winner, allowing the winner to claim the reward (minus platform fees), or allowing the creator to refund if the deadline passes.
- **SubmissionRegistry:** Stores lightweight on-chain proofs of submissions (linking a bounty address, a submitter address, and a metadata URI).

## Core Trust Principles

- **Funds are non-custodial:** ETH is locked in individual Escrow contracts.
- **Metadata is off-chain:** The contracts only store URIs (`metadataURI`, `submissionURI`) to keep gas costs low.
