import { formatEther } from "viem";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Wei string as a decimal ETH amount. Falls back to the raw value when it is not an integer. */
export function formatRewardEth(rewardWei: string): string {
  if (!/^\d+$/.test(rewardWei)) {
    return rewardWei;
  }
  return formatEther(BigInt(rewardWei));
}

/** Unix seconds as a UTC date and time, matching on-chain `block.timestamp`. */
export function formatUnixDateTime(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()} ${hours}:${minutes} UTC`;
}

/** Platform fee in basis points as a percent (100 bps = 1%). */
export function formatFeePercent(feeBps: number): string {
  if (!Number.isFinite(feeBps)) {
    return "—";
  }
  const percent = feeBps / 100;
  const text = Number.isInteger(percent)
    ? String(percent)
    : percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${text}%`;
}
