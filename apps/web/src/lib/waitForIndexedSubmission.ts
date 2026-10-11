import { fetchBountySubmissions } from "./api";

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_INTERVAL_MS = 2_000;
const PAGE_LIMIT = 100;

/** Polls the read API until this submission id is on the bounty, or the timeout elapses. */
export async function waitForIndexedSubmission(
  escrowAddress: string,
  submissionId: number,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (await submissionIsIndexed(escrowAddress, submissionId)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

async function submissionIsIndexed(
  escrowAddress: string,
  submissionId: number,
): Promise<boolean> {
  const first = await fetchBountySubmissions(escrowAddress, {
    page: 1,
    limit: PAGE_LIMIT,
  });
  if (first.items.some((item) => item.submissionId === submissionId)) {
    return true;
  }

  const lastPage = Math.ceil(first.total / PAGE_LIMIT);
  if (lastPage <= 1) {
    return false;
  }

  const last = await fetchBountySubmissions(escrowAddress, {
    page: lastPage,
    limit: PAGE_LIMIT,
  });
  return last.items.some((item) => item.submissionId === submissionId);
}
