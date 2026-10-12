import { ApiError } from "./api";

const KNOWN_REVERTS: Array<[string, string]> = [
  ["not creator", "Only the bounty creator can award a winner."],
  ["deadline passed", "This bounty is past its deadline."],
  ["not open", "This bounty is no longer open."],
  ["invalid submission", "That submission cannot be awarded."],
  ["invalid winner", "That winner address cannot be awarded."],
  ["not awarded", "This bounty has not been awarded."],
  ["not winner", "Only the awarded winner can claim the reward."],
  ["fee transfer failed", "The platform fee transfer failed."],
  ["reward transfer failed", "The reward transfer failed."],
];

function collectMessages(error: unknown): string[] {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("shortMessage" in current && typeof current.shortMessage === "string") {
      parts.push(current.shortMessage);
    }
    if ("message" in current && typeof current.message === "string") {
      parts.push(current.message);
    }
    if ("details" in current && typeof current.details === "string") {
      parts.push(current.details);
    }
    current = "cause" in current ? current.cause : undefined;
  }
  return parts;
}

/** User-facing text for a wallet revert, rejection, or API error. */
export function contractErrorText(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  const parts = collectMessages(error);
  const combined = parts.join("\n");
  const lower = combined.toLowerCase();
  for (const [needle, message] of KNOWN_REVERTS) {
    if (lower.includes(needle)) {
      return message;
    }
  }
  if (/user rejected/i.test(combined)) {
    return "The wallet rejected the transaction.";
  }

  const short = parts.find((part) => part.length > 0 && part.length < 280);
  return short || fallback;
}
