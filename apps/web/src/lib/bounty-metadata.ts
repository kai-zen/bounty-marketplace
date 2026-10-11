import type { BountyMetadata } from "@bounty/types";
import { fetchMetadataById } from "./api";

const METADATA_ID_FROM_URI =
  /\/metadata\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

function isMetadataDocument(value: unknown): value is BountyMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    typeof record.title === "string" &&
    typeof record.description === "string" &&
    Array.isArray(record.tags) &&
    record.tags.every((tag) => typeof tag === "string") &&
    Array.isArray(record.links) &&
    record.links.every((link) => typeof link === "string")
  );
}

async function fetchExternalMetadata(uri: string): Promise<unknown> {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<unknown>;
}

/**
 * Loads the brief for a bounty metadata URI.
 * Marketplace URIs (`/metadata/:id`) use the API client. Other http(s) URIs are fetched directly.
 * A missing or unreadable document returns null so the indexed bounty can still render.
 */
export async function resolveBountyMetadata(
  uri: string,
): Promise<BountyMetadata | null> {
  try {
    const id = METADATA_ID_FROM_URI.exec(uri)?.[1];
    const payload = id
      ? await fetchMetadataById(id)
      : await fetchExternalMetadata(uri);
    return isMetadataDocument(payload) ? payload : null;
  } catch {
    return null;
  }
}
