# Local development

Run these steps from the repo root, in order. You need Node.js 18 or newer, pnpm 9 (the `packageManager` field in the root `package.json`), and Docker.

The full build roadmap is [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## 1. Install dependencies

```bash
pnpm install
```

## 2. Start MongoDB

```bash
docker compose up -d
```

MongoDB 7 listens on `127.0.0.1:27017`. Data stays in the `mongodb_data` volume. `docker compose down` stops the container and keeps that volume.

## 3. Deploy contracts

```bash
pnpm --filter contracts deploy:local
```

This deploys `SubmissionRegistry` and `BountyFactory` and writes `packages/contracts/deployments/31337.json`. `@bounty/types/contracts` loads that manifest. The env files in the next step should use the same `factory` and `registry` addresses. Field meanings, the fee recipient, and the platform fee are documented in [packages/contracts/README.md](../packages/contracts/README.md).

The command uses an in-process Hardhat chain and discards that chain when it exits. It does not leave a JSON-RPC server on port 8545. The manifest is the record you copy into the env files below. `apps/api/.env.example` sets `RPC_URL` for the indexer, which is wired up in later roadmap steps.

## 4. Copy environment files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Leave those copies uncommitted. `.env` and `.env.local` are gitignored.

The examples already match the committed `packages/contracts/deployments/31337.json` addresses. After a deploy that changes `factory` or `registry`, copy those two fields into:

| App | File | Variables |
| --- | --- | --- |
| API | `apps/api/.env` | `FACTORY_ADDRESS`, `REGISTRY_ADDRESS` |
| Web | `apps/web/.env.local` | `NEXT_PUBLIC_FACTORY_ADDRESS`, `NEXT_PUBLIC_REGISTRY_ADDRESS` |

Keep `CHAIN_ID` and `NEXT_PUBLIC_CHAIN_ID` at `31337`.

## 5. Start the apps

```bash
pnpm dev
```

`pnpm dev` starts the API and the web app together. `pnpm dev:api` and `pnpm dev:web` start one of them.

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:3001 (`PORT` in `apps/api/.env`) |
| MongoDB | `mongodb://127.0.0.1:27017/bounty-marketplace` |

The API, indexer, and web UI are still in progress. Later steps in the [roadmap](IMPLEMENTATION_PLAN.md) add config validation, indexing, and pages.
