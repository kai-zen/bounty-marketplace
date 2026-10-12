import { BountyStatus, SubmissionStatus } from "@bounty/types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

/** True when the indexed winner is a real account, not unset or the zero address. */
export function hasAwardedWinner(
  winner: string | null | undefined,
): winner is string {
  return (
    winner != null &&
    winner.length > 0 &&
    winner.toLowerCase() !== ZERO_ADDRESS
  );
}

export type AwardGateInput = {
  status: BountyStatus;
  deadlinePassed: boolean;
  isConnected: boolean;
  wrongChain: boolean;
  isCreator: boolean;
  submissionStatus: SubmissionStatus;
  expectedChainId: number;
};

/**
 * Why `awardWinner` must stay disabled.
 * Status, deadline, then role — matching `BountyEscrow.awardWinner`.
 */
export function awardDisabledReason(input: AwardGateInput): string | null {
  if (input.status !== BountyStatus.Open) {
    return "This bounty is no longer open.";
  }
  if (input.submissionStatus !== SubmissionStatus.Pending) {
    return "This submission cannot be awarded.";
  }
  if (input.deadlinePassed) {
    return "The deadline has passed, so a winner cannot be awarded.";
  }
  if (!input.isConnected) {
    return "Connect the creator wallet to award a winner.";
  }
  if (!input.isCreator) {
    return "Only the bounty creator can award a winner.";
  }
  if (input.wrongChain) {
    return `Switch to chain ${input.expectedChainId} before awarding a winner.`;
  }
  return null;
}

export type ClaimGateInput = {
  status: BountyStatus;
  hasWinner: boolean;
  isConnected: boolean;
  wrongChain: boolean;
  isWinner: boolean;
  expectedChainId: number;
};

/**
 * Why `claimReward` must stay disabled.
 * Status, then role — matching `BountyEscrow.claimReward`.
 */
export function claimDisabledReason(input: ClaimGateInput): string | null {
  if (input.status !== BountyStatus.Awarded) {
    return "This bounty has not been awarded.";
  }
  if (!input.hasWinner) {
    return "The winner address is not available yet.";
  }
  if (!input.isConnected) {
    return "Connect the winner wallet to claim the reward.";
  }
  if (!input.isWinner) {
    return "Only the awarded winner can claim the reward.";
  }
  if (input.wrongChain) {
    return `Switch to chain ${input.expectedChainId} before claiming the reward.`;
  }
  return null;
}

/** Winner share after the platform fee, in wei. Matches `BountyEscrow.claimReward`. */
export function winnerPayoutWei(
  rewardWei: string,
  platformFeeBps: number,
): string | null {
  if (!/^\d+$/.test(rewardWei)) {
    return null;
  }
  if (
    !Number.isInteger(platformFeeBps) ||
    platformFeeBps < 0 ||
    platformFeeBps > 10_000
  ) {
    return null;
  }
  const reward = BigInt(rewardWei);
  const fee = (reward * BigInt(platformFeeBps)) / 10_000n;
  return (reward - fee).toString();
}
