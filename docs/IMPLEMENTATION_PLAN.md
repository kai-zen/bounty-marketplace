# Implementation Plan

Step-by-step build plan for the Web3 Bounty Marketplace monorepo.

```text
[scope]: short imperative description
```

Execute steps **in order**; later steps depend on earlier ones.

---

## Phase 0 — Repo hygiene & docs

### Step 1

`[docs]: fix monorepo paths and align root README with apps layout`

- Fix `app/api` → `apps/api` in root `README.md`.
- Add a brief “Current status” note: smart contracts complete; API, indexer, and web UI in progress.
- **Verify:** README paths match the repository layout; no functional code changes.

### Step 2

`[chore]: remove nested web lockfile and pnpm-workspace`

- Remove `apps/web/pnpm-lock.yaml` and `apps/web/pnpm-workspace.yaml` if they are leftovers from `create-next-app`.
- Ensure the web app is wired only through the root pnpm workspace.
- **Verify:** `pnpm install` from repo root succeeds; a single root `pnpm-lock.yaml` drives the monorepo.

### Step 3

`[chore]: extend turbo tasks for dev and contract compile`

- In `turbo.json`: ensure `dev` runs for `@bounty/api` and `@bounty/web`; add or wire `test` / `compile` for `contracts` if missing.
- In root `package.json`: add helper scripts such as `dev:web`, `dev:api`, `test:contracts` via turbo filters.
- **Verify:** `pnpm --filter contracts compile` and `pnpm --filter @bounty/web dev` (smoke) work.

---

## Phase 1 — Shared types

### Step 4

`[types]: add on-chain aligned enums and status types`

- In `packages/types`: add `BountyStatus`, `SubmissionStatus`, address type (e.g. `` `0x${string}` ``), block/time fields as `number`.
- Mirror Solidity enums with comments referencing `BountyEscrow` and `SubmissionRegistry`.
- **Verify:** `apps/api` and `apps/web` can import types (compile-only).

### Step 5

`[types]: add metadata document shapes for bounty and submission`

- Off-chain JSON types: `BountyMetadata`, `SubmissionMetadata` (title, description, tags, links; keep v1 minimal).
- Include a `version` field for forward compatibility.
- **Verify:** Types are ready for MetadataModule validation.

### Step 6

`[types]: add API list and detail DTOs`

- Add `BountySummary`, `BountyDetail`, `SubmissionSummary`, `ActivityEvent`, `PageParams`, `PageResult<T>`.
- **Verify:** Shapes match indexer output and planned Explore / Detail / Dashboard pages.

### Step 7

`[types]: export contract event payload types`

- Typed payloads for: `BountyCreated`, `WorkSubmitted`, `WinnerAwarded`, `RewardClaimed`, `BountyRefunded`, `SubmissionSelected`, fee config events.
- **Verify:** Field names align with Solidity event definitions.

---

## Phase 2 — Contract artifacts & deploy

### Step 8

`[contracts]: add ABI export script to packages/contracts/abis`

- Add a script (post-`compile` or `pnpm export-abis`) that writes JSON ABIs for Factory, Escrow, and Registry.
- Document the output path in `packages/contracts/README.md`.
- **Verify:** ABIs exist after `pnpm compile`; decide whether ABIs are committed or regenerated-only and document the choice.

### Step 9

`[contracts]: add Hardhat Ignition deploy module for local chain`

- Ignition module: deploy `SubmissionRegistry`, then `BountyFactory` (registry, fee recipient, platform fee bps).
- Use dev accounts / env for fee recipient on local networks.
- **Verify:** Deploy succeeds on `hardhatMainnet` (or configured local EDR network).

### Step 10

`[contracts]: add deployment manifest schema and local sample`

- Define JSON shape: `{ chainId, factory, registry, deployedAt }` (and any other shared addresses).
- Commit a sample `deployments/31337.json` from a local deploy (no secrets).
- **Verify:** Web and API can follow a documented path convention for addresses.

### Step 11

`[types]: re-export contract ABIs and address types for apps`

- Thin module (e.g. `packages/types/contracts.ts`) importing ABIs + deployment manifest type.
- **Verify:** Single import site for wagmi `abi` + addresses in the web app.

---

## Phase 3 — Local dev environment

### Step 12

`[chore]: add docker-compose for MongoDB and env examples`

- `docker-compose.yml`: MongoDB 7, port 27017, named volume.
- `apps/api/.env.example`: `MONGODB_URI`, `PORT`, `RPC_URL`, `CHAIN_ID`, contract addresses, `INDEXER_START_BLOCK`.
- `apps/web/.env.example`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_FACTORY_ADDRESS`, `NEXT_PUBLIC_REGISTRY_ADDRESS`.
- **Verify:** `docker compose up -d`; API connects with a copied `.env`.

### Step 13

`[docs]: add local development runbook`

- Document ordered startup in `docs/LOCAL_DEVELOPMENT.md`: Mongo → deploy contracts → copy env → `pnpm dev`.
- Root `README.md` stays a short overview and links to that runbook.
- Link to this file (`docs/IMPLEMENTATION_PLAN.md`) for the full roadmap.
- **Verify:** Cold start is followable without chat context.

---

## Phase 4 — API foundation

### Step 14

`[api]: add ConfigModule and validated environment`

- Add `@nestjs/config` and env validation (Joi, Zod, or class-validator—match Nest patterns in the repo).
- Fail fast on boot when Mongo, RPC, or contract addresses are missing.
- **Verify:** API fails clearly without `.env`; starts with valid `.env`.

### Step 15

`[api]: connect Mongoose and health module`

- `MongooseModule.forRoot`; `GET /health` with Mongo connectivity check.
- Replace or remove default hello-world-only surface in favor of health.
- **Verify:** `/health` returns 200 with Mongo running.

### Step 16

`[api]: register global API prefix and CORS for web`

- Global prefix e.g. `/api/v1`; CORS for `http://localhost:3000` (and dev web port if different).
- **Verify:** Browser can call health from the Next.js origin.

---

## Phase 5 — Metadata storage

### Step 17

`[api]: add MetadataModule schema and POST endpoints`

- Mongoose `Metadata` collection: `id`, `kind` (`bounty` | `submission`), `payload`, `createdAt`.
- `POST /metadata/bounties`, `POST /metadata/submissions`: validate against `@bounty/types`, persist JSON, return a **URI** string (document the scheme, e.g. `https://api.../metadata/:id` or internal id—contracts require non-empty string only).
- **Verify:** curl/Postman creates documents and returns a usable URI.

### Step 18

`[api]: add GET metadata by id`

- `GET /metadata/:id` returns stored JSON (public read).
- **Verify:** URI returned from POST is fetchable and matches payload used in a manual `createBounty` test.

---

## Phase 6 — Indexer core

### Step 19

`[api]: add BlockchainModule with viem public client`

- RPC and `CHAIN_ID` from env; Factory and Registry addresses from env.
- **Verify:** Module can read `getBlockNumber()` on startup (log or health sub-check).

### Step 20

`[api]: add Bounty and Submission Mongoose schemas`

- **Bounty:** escrow address (unique), creator, reward, deadline, metadataURI, status, winner, winningSubmissionId, tx metadata, block numbers.
- **Submission:** submissionId, bountyAddress, submitter, submissionURI, status.
- **Verify:** Schemas compile; no public HTTP required yet.

### Step 21

`[api]: add IndexerModule skeleton and cursor persistence`

- `IndexerState` collection: `lastProcessedBlock`.
- On module init: load cursor; polling or subscription wiring without full handlers yet.
- **Verify:** App starts; cursor document can be created/updated.

### Step 22

`[api]: index BountyCreated and WorkSubmitted events`

- Factory `BountyCreated` → upsert `Bounty`.
- Registry `WorkSubmitted` → upsert `Submission`.
- Advance cursor after each processed batch.
- **Verify:** After local `createBounty` + `submitWork`, MongoDB contains expected rows.

### Step 23

`[api]: index award claim refund and submission selected events`

- Escrow: `WinnerAwarded`, `RewardClaimed`, `BountyRefunded`.
- Registry: `SubmissionSelected` → update submission status.
- Update `Bounty.status` to match on-chain state.
- **Verify:** Full local lifecycle through claim or refund updates the DB correctly.

---

## Phase 7 — Read APIs

### Step 24

`[api]: add BountiesModule list and detail endpoints`

- `GET /bounties` (pagination, optional status filter).
- `GET /bounties/:escrowAddress`.
- **Verify:** List/detail responses match indexed data (curl).

### Step 25

`[api]: add SubmissionsModule endpoints`

- `GET /bounties/:escrowAddress/submissions`.
- `GET /submissions?submitter=0x...` for dashboard.
- **Verify:** Submissions appear after indexer runs.

### Step 26

`[api]: add ActivityModule append-only timeline`

- On index writes, append `ActivityEvent` (type, bounty, actor, txHash, timestamp).
- `GET /activity?bounty=` and `GET /activity` with limit.
- **Verify:** Timeline order: create → submit → award → claim (or refund).

### Step 27

`[api]: denormalize bounty title from metadata on index`

- When handling `BountyCreated`, resolve metadata URI and store `title` (and optional search fields) on `Bounty`.
- **Verify:** `GET /bounties?search=` works without N+1 metadata fetches.

---

## Phase 8 — Shared UI package

### Step 28

`[ui]: add MUI theme and AppThemeProvider`

- Export `AppThemeProvider`, baseline theme, `CssBaseline`.
- **Verify:** Provider can wrap the web app layout.

### Step 29

`[ui]: add AppShell PageHeader and StatusChip`

- Layout chrome; status chip mapped from `@bounty/types` enums.
- **Verify:** Renders with mock props.

### Step 30

`[ui]: add BountyCard and EmptyState`

- Card: title, reward display, deadline, status.
- **Verify:** Ready for Explore page consumption.

---

## Phase 9 — Web foundation

### Step 31

`[web]: add wagmi viem config and providers`

- `WagmiProvider`, TanStack `QueryClientProvider`; local Hardhat chain + optional Sepolia from env.
- Connect wallet control (web or `@bounty/ui`—pick one location).
- **Verify:** Wallet connects on local chain.

### Step 32

`[web]: wire AppThemeProvider and AppShell in root layout`

- Update site metadata (title, description) for the marketplace.
- **Verify:** All routes share shell and theme.

### Step 33

`[web]: add API client helper and env validation`

- Typed helpers: `fetchBounties`, `fetchBounty`, `postBountyMetadata`, etc., using `@bounty/types`.
- **Verify:** Client calls `/health` and `/bounties`.

---

## Phase 10 — Web pages

### Step 34

`[web]: implement Explore page at root`

- Fetch bounty list from API; loading and error states; `BountyCard` grid; links to `/bounty/[address]`.
- **Verify:** Indexed bounties appear on `/`.

### Step 35

`[web]: implement Create Bounty page at /create`

- Form → POST metadata → `factory.createBounty{value}` with returned URI.
- **Verify:** New bounty shows on Explore after indexer sync (poll or refetch).

### Step 36

`[web]: implement Bounty detail read-only at /bounty/[address]`

- Metadata, reward, deadline, status, submissions, activity timeline.
- **Verify:** Matches on-chain state and API for one escrow.

### Step 37

`[web]: add submit work flow on bounty detail`

- POST submission metadata → `registry.submitWork(bounty, uri)`.
- **Verify:** Submission appears in list after index.

### Step 38

`[web]: add creator award and winner claim actions`

- Creator: `awardWinner`; winner: `claimReward`; disable actions by role and status.
- **Verify:** Happy path through claim on local chain.

### Step 39

`[web]: add creator refund and Dashboard at /dashboard`

- Refund when expired and status Open.
- Dashboard: created bounties, submissions, claimable awards for connected wallet.
- **Verify:** Refund behavior matches Solidity integration tests.

---

## Phase 11 — Quality & CI

### Step 40

`[api]: add e2e test for metadata and bounties list`

- Supertest: POST metadata; GET bounties (empty then seeded).
- **Verify:** `pnpm --filter @bounty/api test:e2e` passes.

### Step 41

`[ci]: add GitHub Actions for contracts test and api web build`

- Job: install, `pnpm --filter contracts test`.
- Job: build `@bounty/api` and `@bounty/web`.
- **Verify:** CI green on default branch.

---

## Optional follow-ups (one commit each)

| Step | Commit                                                                  |
| ---- | ----------------------------------------------------------------------- |
| 42   | `[contracts]: document Sepolia Ignition deploy without secrets in repo` |
| 43   | `[api]: optional IPFS or pin helper for metadata URIs`                  |
| 44   | `[web]: search and filter UX on Explore`                                |
| 45   | `[api]: indexer reorg safety with block confirmations`                  |

---

## Execution notes

1. **Do not combine steps** in a single commit (e.g. indexer + Explore page).
2. **Checkpoint after Steps 22–23:** run the Solidity integration flow against API + Mongo before building all UI pages.
3. **After Step 11:** pin contract addresses in `.env` for stable web/API development.
4. If a step feels too large, split it while keeping the same scope prefix—for example Step 38 can become two commits: `[web]: add award winner on bounty detail` and `[web]: add claim reward on bounty detail`.

---

## Progress tracker

Use this checklist when committing; mark `[x]` as you go.

- [x] Step 1 — README paths and status
- [x] Step 2 — Remove nested web pnpm files
- [x] Step 3 — Turbo dev/compile tasks
- [x] Step 4 — On-chain aligned types
- [x] Step 5 — Metadata document types
- [x] Step 6 — API DTOs
- [x] Step 7 — Event payload types
- [x] Step 8 — ABI export script
- [x] Step 9 — Ignition local deploy
- [x] Step 10 — Deployment manifest sample
- [x] Step 11 — Types re-export ABIs
- [x] Step 12 — Docker Mongo + env examples
- [x] Step 13 — Local dev runbook
- [x] Step 14 — API config validation
- [x] Step 15 — Mongoose + health
- [x] Step 16 — API prefix + CORS
- [x] Step 17 — Metadata POST
- [x] Step 18 — Metadata GET
- [x] Step 19 — BlockchainModule viem
- [x] Step 20 — Bounty/Submission schemas
- [x] Step 21 — Indexer skeleton + cursor
- [x] Step 22 — Index create + submit events
- [ ] Step 23 — Index award/claim/refund events
- [ ] Step 24 — Bounties read API
- [ ] Step 25 — Submissions read API
- [ ] Step 26 — Activity timeline API
- [ ] Step 27 — Denormalize title on index
- [ ] Step 28 — UI theme provider
- [ ] Step 29 — AppShell and StatusChip
- [ ] Step 30 — BountyCard and EmptyState
- [ ] Step 31 — Wagmi/viem providers
- [ ] Step 32 — Layout shell + metadata
- [ ] Step 33 — API client helpers
- [ ] Step 34 — Explore page
- [ ] Step 35 — Create bounty page
- [ ] Step 36 — Bounty detail read-only
- [ ] Step 37 — Submit work flow
- [ ] Step 38 — Award and claim
- [ ] Step 39 — Refund and dashboard
- [ ] Step 40 — API e2e tests
- [ ] Step 41 — GitHub Actions CI
