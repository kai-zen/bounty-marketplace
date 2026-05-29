# Web3 Bounty Marketplace - Backend & Indexer

NestJS application backed by MongoDB. Serves as the metadata storage and blockchain event indexer for the marketplace.

## Tech Stack

- **Framework:** NestJS
- **Database:** MongoDB (via Mongoose)

## Modules

- **BountiesModule:** Serves indexed bounty data and metadata.
- **SubmissionsModule:** Serves indexed submission data and metadata.
- **MetadataModule:** Handles off-chain JSON storage (returning URIs for on-chain use).
- **ActivityModule:** Maintains a readable timeline of all marketplace contract events.
- **IndexerModule:** Background service that listens to blockchain events (Creation, Submissions, Awards, Claims, Refunds) and updates the local MongoDB state for fast frontend querying.
