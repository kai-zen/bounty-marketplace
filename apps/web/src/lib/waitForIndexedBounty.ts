import { ApiError, fetchBounty } from "./api";

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_INTERVAL_MS = 2_000;

/** Polls the read API until the indexer has the escrow, or the timeout elapses. */
export async function waitForIndexedBounty(
  escrowAddress: string,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      await fetchBounty(escrowAddress);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status !== 404) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}
