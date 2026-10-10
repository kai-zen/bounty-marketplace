/** Hex-encoded EVM address. Compatible with viem `Address`. */
export type Address = `0x${string}`;

/** Chain block number. Stored as `number` in v1 (not `bigint`). */
export type BlockNumber = number;

/** Unix time in seconds. Matches Solidity `block.timestamp` and deadline fields. */
export type UnixTimestamp = number;

/**
 * On-chain bounty lifecycle.
 * Mirrors `BountyEscrow.BountyStatus` (Open = 0, Awarded = 1, Claimed = 2, Refunded = 3).
 */
export enum BountyStatus {
  Open = 0,
  Awarded = 1,
  Claimed = 2,
  Refunded = 3,
}

/**
 * On-chain submission lifecycle.
 * Mirrors `SubmissionRegistry.SubmissionStatus` (Pending = 0, Selected = 1).
 */
export enum SubmissionStatus {
  Pending = 0,
  Selected = 1,
}

/** Current off-chain metadata document version. Bump when the JSON shape changes. */
export const METADATA_VERSION = 1;

export type MetadataVersion = typeof METADATA_VERSION;

/**
 * Off-chain bounty JSON posted to MetadataModule (`kind: "bounty"`).
 * On-chain contracts store only a URI pointing at this document.
 */
export interface BountyMetadata {
  version: MetadataVersion;
  title: string;
  description: string;
  tags: string[];
  links: string[];
}

/**
 * Off-chain submission JSON posted to MetadataModule (`kind: "submission"`).
 * On-chain contracts store only a URI pointing at this document.
 */
export interface SubmissionMetadata {
  version: MetadataVersion;
  title: string;
  description: string;
  tags: string[];
  links: string[];
}

/** Transaction or other 32-byte hash. */
export type Hex = `0x${string}`;

/** Reward amount in wei. JSON `string` so values above `Number.MAX_SAFE_INTEGER` stay exact. */
export type WeiAmount = string;

/**
 * List-card bounty for Explore and Dashboard.
 * `title` is denormalized from metadata so list/search avoid N+1 fetches.
 */
export interface BountySummary {
  escrowAddress: Address;
  creator: Address;
  title: string;
  reward: WeiAmount;
  deadline: UnixTimestamp;
  status: BountyStatus;
  winner: Address | null;
}

/** Full bounty for the detail page, including resolved metadata and index provenance. */
export interface BountyDetail extends BountySummary {
  metadataURI: string;
  metadata: BountyMetadata | null;
  winningSubmissionId: number | null;
  submissionRegistry: Address;
  feeRecipient: Address;
  platformFeeBps: number;
  createdTxHash: Hex;
  createdBlockNumber: BlockNumber;
}

/** Submission row for bounty detail and Dashboard (`GET /submissions?submitter=`). */
export interface SubmissionSummary {
  submissionId: number;
  bountyAddress: Address;
  submitter: Address;
  title: string;
  submissionURI: string;
  status: SubmissionStatus;
}

/** Timeline kinds. Order on a bounty: create → submit → award → claim (or refund). */
export type ActivityEventType =
  | "BountyCreated"
  | "WorkSubmitted"
  | "SubmissionSelected"
  | "WinnerAwarded"
  | "RewardClaimed"
  | "BountyRefunded";

/** Append-only activity item written by the indexer. */
export interface ActivityEvent {
  type: ActivityEventType;
  bounty: Address;
  actor: Address;
  txHash: Hex;
  timestamp: UnixTimestamp;
  submissionId?: number;
}

/** Query params for paginated list endpoints (`GET /bounties`, etc.). */
export interface PageParams {
  page?: number;
  limit?: number;
}

/** Envelope for paginated list responses. */
export interface PageResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

/**
 * `BountyFactory.BountyCreated` args.
 * `amount` is the funded reward (`msg.value`) in wei.
 */
export interface BountyCreated {
  bountyId: number;
  escrow: Address;
  creator: Address;
  deadline: UnixTimestamp;
  metadataURI: string;
  amount: WeiAmount;
}

/** `SubmissionRegistry.WorkSubmitted` args. */
export interface WorkSubmitted {
  submissionId: number;
  bountyAddress: Address;
  submitter: Address;
  submissionURI: string;
}

/** `BountyEscrow.WinnerAwarded` args. */
export interface WinnerAwarded {
  winner: Address;
  submissionId: number;
}

/** `BountyEscrow.RewardClaimed` args. */
export interface RewardClaimed {
  winner: Address;
  winnerAmount: WeiAmount;
}

/** `BountyEscrow.BountyRefunded` args. */
export interface BountyRefunded {
  creator: Address;
  amount: WeiAmount;
}

/** `SubmissionRegistry.SubmissionSelected` args. */
export interface SubmissionSelected {
  submissionId: number;
  bountyAddress: Address;
  submitter: Address;
}

/** `BountyFactory.FeeRecipientUpdated` args. */
export interface FeeRecipientUpdated {
  previousRecipient: Address;
  newRecipient: Address;
}

/** `BountyFactory.PlatformFeeUpdated` args. */
export interface PlatformFeeUpdated {
  previousFeeBps: number;
  newFeeBps: number;
}

/** `BountyEscrow.PlatformFeePaid` args. */
export interface PlatformFeePaid {
  feeRecipient: Address;
  feeAmount: WeiAmount;
}
