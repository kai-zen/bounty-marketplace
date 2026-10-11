"use client";

import type { BountySummary, UnixTimestamp, WeiAmount } from "@bounty/types";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { StatusChip } from "./StatusChip";

export type BountyCardProps = {
  bounty: BountySummary;
  /** Defaults to `/bounty/{escrowAddress}`. */
  href?: string;
};

function formatRewardEth(rewardWei: WeiAmount): string {
  const value = BigInt(rewardWei);
  const weiPerEth = BigInt(10) ** BigInt(18);
  const whole = value / weiPerEth;
  const fraction = value % weiPerEth;
  const fractionDigits = fraction.toString().padStart(18, "0").replace(/0+$/, "");
  const amount = fractionDigits ? `${whole}.${fractionDigits}` : whole.toString();
  return `${amount} ETH`;
}

function formatDeadline(deadline: UnixTimestamp): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(deadline * 1000));
}

/** Explore / dashboard list card for a bounty summary row. */
export function BountyCard({ bounty, href }: BountyCardProps) {
  const targetHref = href ?? `/bounty/${bounty.escrowAddress}`;

  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea
        component={Link}
        href={targetHref}
        sx={{ height: "100%", alignItems: "stretch" }}
      >
        <CardContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                gap: 1,
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h6" component="h2" sx={{ flex: 1, pr: 1 }}>
                {bounty.title}
              </Typography>
              <StatusChip kind="bounty" status={bounty.status} />
            </Box>
            <Typography
              variant="body1"
              color="primary.main"
              sx={{ fontWeight: 600 }}
            >
              {formatRewardEth(bounty.reward)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deadline: {formatDeadline(bounty.deadline)}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
