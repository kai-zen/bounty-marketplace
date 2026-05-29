# Web3 Bounty Marketplace - Frontend

Next.js application providing the user interface for the Bounty Marketplace.

## Tech Stack

- **Framework:** Next.js
- **Styling:** Material UI (MUI)
- **Web3 Integration:** Viem + Wagmi

## Pages & Features

- **`/` (Explore):** Browse, search, and filter all bounties. Data fetched via Backend API.
- **`/create` (Create Bounty):** Form to define a bounty, upload metadata to the backend, and execute the on-chain creation transaction.
- **`/bounty/:address` (Bounty Details):** View bounty info, submissions, and timeline. Creators can award winners; winners can claim ETH; creators can refund expired bounties.
- **`/dashboard` (Dashboard):** Wallet-centric view of created bounties, submitted work, and claimable rewards.

## Identity Model

Identity is strictly managed via Web3 Wallet addresses. No traditional email/password authentication is required.
