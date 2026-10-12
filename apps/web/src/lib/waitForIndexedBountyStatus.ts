import { BountyStatus, SubmissionStatus } from "@bounty/types";
import { ApiError, fetchBounty, fetchBountySubmissions } from "./api";

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_INTERVAL_MS = 2_000;
const PAGE_LIMIT = 100;

type WaitOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  /** When set with `Awarded`, also wait until this submission is Selected. */
  winningSubmissionId?: number;
};

/**
 * Polls the read API until the bounty has `expected` status.
 * For an award, pass `winningSubmissionId` so the page refresh includes the selected submission.
 */
export async function waitForIndexedBountyStatus(
  escrowAddress: string,
  expected: BountyStatus,
  options?: WaitOptions,
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      if (await bountyMatches(escrowAddress, expected, options?.winningSubmissionId)) {
        return true;
      }
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

async function bountyMatches(
  escrowAddress: string,
  expected: BountyStatus,
  winningSubmissionId: number | undefined,
): Promise<boolean> {
  const bounty = await fetchBounty(escrowAddress);
  if (bounty.status !== expected) {
    return false;
  }
  if (
    winningSubmissionId != null &&
    bounty.winningSubmissionId !== winningSubmissionId
  ) {
    return false;
  }
  if (expected === BountyStatus.Awarded && winningSubmissionId != null) {
    return submissionIsSelected(escrowAddress, winningSubmissionId);
  }
  return true;
}

async function submissionIsSelected(
  escrowAddress: string,
  submissionId: number,
): Promise<boolean> {
  const first = await fetchBountySubmissions(escrowAddress, {
    page: 1,
    limit: PAGE_LIMIT,
  });
  const onFirst = first.items.find((item) => item.submissionId === submissionId);
  if (onFirst) {
    return onFirst.status === SubmissionStatus.Selected;
  }

  const lastPage = Math.ceil(first.total / PAGE_LIMIT);
  if (lastPage <= 1) {
    return false;
  }

  const last = await fetchBountySubmissions(escrowAddress, {
    page: lastPage,
    limit: PAGE_LIMIT,
  });
  return (
    last.items.find((item) => item.submissionId === submissionId)?.status ===
    SubmissionStatus.Selected
  );
}
