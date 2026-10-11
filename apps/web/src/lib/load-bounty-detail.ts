import type {
  ActivityEvent,
  Address,
  BountyDetail,
  BountyMetadata,
  PageResult,
  SubmissionSummary,
} from "@bounty/types";
import { cache } from "react";
import { ApiError, fetchActivity, fetchBounty, fetchBountySubmissions } from "./api";
import { resolveBountyMetadata } from "./bounty-metadata";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const LIST_LIMIT = 100;

export type BountyDetailData = {
  status: "ok";
  title: string;
  bounty: BountyDetail;
  metadata: BountyMetadata | null;
  submissions: PageResult<SubmissionSummary>;
  activity: ActivityEvent[];
};

export type BountyDetailLoad =
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | BountyDetailData;

export function bountyDisplayTitle(
  bounty: BountyDetail,
  metadata: BountyMetadata | null,
): string {
  const title = metadata?.title.trim() || bounty.title.trim();
  return title || "Untitled bounty";
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Could not load this bounty. Start the API and check NEXT_PUBLIC_API_URL.";
}

async function loadMetadata(bounty: BountyDetail): Promise<BountyMetadata | null> {
  if (bounty.metadata) {
    return bounty.metadata;
  }
  if (!bounty.metadataURI.trim()) {
    return null;
  }
  return resolveBountyMetadata(bounty.metadataURI);
}

/** Escrow detail, brief, submissions, and activity for `/bounty/[address]`. */
export const loadBountyDetail = cache(
  async (rawAddress: string): Promise<BountyDetailLoad> => {
    let address: string;
    try {
      address = decodeURIComponent(rawAddress).trim();
    } catch {
      return { status: "invalid" };
    }
    if (!EVM_ADDRESS.test(address)) {
      return { status: "invalid" };
    }

    const escrow = address.toLowerCase() as Address;

    try {
      const bounty = await fetchBounty(escrow);
      const [submissions, activityResult, metadata] = await Promise.all([
        fetchBountySubmissions(escrow, { limit: LIST_LIMIT }),
        fetchActivity({ bounty: escrow, limit: LIST_LIMIT }),
        loadMetadata(bounty),
      ]);

      return {
        status: "ok",
        title: bountyDisplayTitle(bounty, metadata),
        bounty,
        metadata,
        submissions,
        activity: activityResult.items,
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { status: "not-found" };
      }
      return { status: "error", message: errorMessage(error) };
    }
  },
);
