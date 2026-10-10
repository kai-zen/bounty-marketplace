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
