"use client";

import type { Address, BountySummary, UnixTimestamp, WeiAmount } from "@bounty/types";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { fontFamilies } from "./theme";
import { StatusChip } from "./StatusChip";

export type BountyCardProps = {
  bounty: BountySummary;
  /** Defaults to `/bounty/{escrowAddress}`. */
  href?: string;
};

function formatRewardEth(rewardWei: WeiAmount): { amount: string; unit: string } {
  const value = BigInt(rewardWei);
  const weiPerEth = BigInt(10) ** BigInt(18);
  const whole = value / weiPerEth;
  const fraction = value % weiPerEth;
  const fractionDigits = fraction.toString().padStart(18, "0").replace(/0+$/, "");
  const amount = fractionDigits ? `${whole}.${fractionDigits}` : whole.toString();
  return { amount, unit: "ETH" };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDeadline(deadline: UnixTimestamp): string {
  const date = new Date(deadline * 1000);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function shortenAddress(address: Address): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Explore / dashboard list card for a bounty summary row. */
export function BountyCard({ bounty, href }: BountyCardProps) {
  const targetHref = href ?? `/bounty/${bounty.escrowAddress}`;
  const reward = formatRewardEth(bounty.reward);

  return (
    <Card
      sx={{
        height: "100%",
        transition: "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: "primary.light",
          boxShadow: "0 12px 32px rgba(22, 21, 19, 0.08)",
        },
      }}
    >
      <CardActionArea
        component={Link}
        href={targetHref}
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: 2.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 1,
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="h6"
              component="h2"
              sx={{ flex: 1, pr: 1 }}
            >
              {bounty.title}
            </Typography>
            <StatusChip kind="bounty" status={bounty.status} />
          </Box>
          <Box sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Typography
              sx={{
                fontFamily: fontFamilies.mono,
                fontSize: "1.35rem",
                fontWeight: 650,
                color: "secondary.main",
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
              }}
            >
              {reward.amount}
              <Box
                component="span"
                sx={{
                  ml: 0.75,
                  fontSize: "0.72rem",
                  fontWeight: 650,
                  letterSpacing: "0.06em",
                  color: "text.secondary",
                }}
              >
                {reward.unit}
              </Box>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Due {formatDeadline(bounty.deadline)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: fontFamilies.mono }}
            >
              {shortenAddress(bounty.creator)}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
