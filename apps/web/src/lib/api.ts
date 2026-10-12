import type {
  ActivityEvent,
  Address,
  BountyDetail,
  BountyMetadata,
  BountyStatus,
  BountySummary,
  PageParams,
  PageResult,
  SubmissionMetadata,
  SubmissionSummary,
} from "@bounty/types";
import { getWebEnv } from "./env";

const API_PREFIX = "/api/v1";
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type HealthCheckResponse = {
  status: "error" | "ok" | "shutting_down";
  info?: Record<string, { status: string; message?: string }>;
  error?: Record<string, { status: string; message?: string }>;
  details?: Record<string, { status: string; message?: string }>;
};

export type MetadataCreateResponse = {
  uri: string;
};

export type ListBountiesParams = PageParams & {
  status?: BountyStatus;
  search?: string;
  creator?: Address;
};

export type ListActivityParams = {
  limit?: number;
  bounty?: Address;
};

export type ListSubmitterSubmissionsParams = PageParams & {
  submitter: Address;
};

function apiUrl(path: string): string {
  const base = getWebEnv().apiUrl;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${API_PREFIX}${normalized}`;
}

function toQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function normalizeEscrowAddress(escrowAddress: string): Address {
  if (!EVM_ADDRESS.test(escrowAddress)) {
    throw new ApiError("Invalid escrow address", 400);
  }
  return escrowAddress.toLowerCase() as Address;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let body: unknown;
    const text = await response.text();
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text;
    }
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : response.statusText || "API request failed";
    throw new ApiError(message, response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthCheckResponse> {
  return apiFetch<HealthCheckResponse>("/health");
}

export async function fetchBounties(
  params: ListBountiesParams = {},
): Promise<PageResult<BountySummary>> {
  return apiFetch<PageResult<BountySummary>>(
    `/bounties${toQueryString({
      page: params.page,
      limit: params.limit,
      status: params.status,
      search: params.search,
      creator: params.creator?.toLowerCase(),
    })}`,
  );
}

export async function fetchBounty(escrowAddress: string): Promise<BountyDetail> {
  const address = normalizeEscrowAddress(escrowAddress);
  return apiFetch<BountyDetail>(`/bounties/${address}`);
}

export async function postBountyMetadata(
  body: BountyMetadata,
): Promise<MetadataCreateResponse> {
  return apiFetch<MetadataCreateResponse>("/metadata/bounties", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postSubmissionMetadata(
  body: SubmissionMetadata,
): Promise<MetadataCreateResponse> {
  return apiFetch<MetadataCreateResponse>("/metadata/submissions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchMetadataById(
  id: string,
): Promise<BountyMetadata | SubmissionMetadata> {
  return apiFetch<BountyMetadata | SubmissionMetadata>(
    `/metadata/${encodeURIComponent(id)}`,
  );
}

export async function fetchBountySubmissions(
  escrowAddress: string,
  params: PageParams = {},
): Promise<PageResult<SubmissionSummary>> {
  const address = normalizeEscrowAddress(escrowAddress);
  return apiFetch<PageResult<SubmissionSummary>>(
    `/bounties/${address}/submissions${toQueryString({
      page: params.page,
      limit: params.limit,
    })}`,
  );
}

export async function fetchSubmissionsBySubmitter(
  params: ListSubmitterSubmissionsParams,
): Promise<PageResult<SubmissionSummary>> {
  if (!EVM_ADDRESS.test(params.submitter)) {
    throw new ApiError("Invalid submitter address", 400);
  }
  return apiFetch<PageResult<SubmissionSummary>>(
    `/submissions${toQueryString({
      page: params.page,
      limit: params.limit,
      submitter: params.submitter.toLowerCase(),
    })}`,
  );
}

export async function fetchActivity(
  params: ListActivityParams = {},
): Promise<{ items: ActivityEvent[]; limit: number }> {
  return apiFetch<{ items: ActivityEvent[]; limit: number }>(
    `/activity${toQueryString({
      limit: params.limit,
      bounty: params.bounty,
    })}`,
  );
}
