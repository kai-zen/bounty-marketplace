"use client";

import { ConnectWallet } from "@/components/ConnectWallet";
import {
  ApiError,
  fetchBounties,
  fetchSubmissionsBySubmitter,
} from "@/lib/api";
import { hasAwardedWinner, sameAddress } from "@/lib/bounty-actions";
import { formatAddress } from "@/lib/formatAddress";
import {
  BountyStatus,
  type Address,
  type BountySummary,
  type SubmissionSummary,
} from "@bounty/types";
import { BountyCard, EmptyState, fontFamilies } from "@bounty/ui";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useConnection } from "wagmi";

const LIST_LIMIT = 50;

type DashboardData = {
  created: BountySummary[];
  claimable: BountySummary[];
  submissions: SubmissionSummary[];
};

function dashboardErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Could not load dashboard data. Start the API and check NEXT_PUBLIC_API_URL.";
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      ) : (
        <Box sx={{ mb: 2 }} />
      )}
      {children}
    </Box>
  );
}

function BountyGrid({ items }: { items: BountySummary[] }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2.5,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
        },
      }}
    >
      {items.map((bounty) => (
        <BountyCard key={bounty.escrowAddress} bounty={bounty} />
      ))}
    </Box>
  );
}

function SubmissionList({ items }: { items: SubmissionSummary[] }) {
  return (
    <Stack spacing={1.5}>
      {items.map((submission) => {
        const title =
          submission.title.trim() || `Submission #${submission.submissionId}`;
        const href = `/bounty/${submission.bountyAddress}`;
        return (
          <Paper key={`${submission.bountyAddress}-${submission.submissionId}`} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" component="h3">
              <Link component={NextLink} href={href} underline="hover">
                {title}
              </Link>
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5, fontFamily: fontFamilies.mono }}
            >
              Bounty {formatAddress(submission.bountyAddress)} · #
              {submission.submissionId}
            </Typography>
          </Paper>
        );
      })}
    </Stack>
  );
}

async function loadDashboard(wallet: Address): Promise<DashboardData> {
  const normalized = wallet.toLowerCase() as Address;
  const [createdPage, awardedPage, submissionsPage] = await Promise.all([
    fetchBounties({ creator: normalized, limit: LIST_LIMIT }),
    fetchBounties({ status: BountyStatus.Awarded, limit: LIST_LIMIT }),
    fetchSubmissionsBySubmitter({ submitter: normalized, limit: LIST_LIMIT }),
  ]);

  const claimable = awardedPage.items.filter(
    (bounty) =>
      hasAwardedWinner(bounty.winner) &&
      sameAddress(bounty.winner, normalized),
  );

  return {
    created: createdPage.items,
    claimable,
    submissions: submissionsPage.items,
  };
}

function DashboardConnected({ address }: { address: Address }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (wallet: Address) => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadDashboard(wallet));
    } catch (err) {
      setData(null);
      setError(dashboardErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(address);
  }, [address, refresh]);

  if (loading && !data) {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", py: 10 }}
        role="status"
        aria-live="polite"
        aria-label="Loading dashboard"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Alert
        severity="error"
        action={
          <Link
            component="button"
            type="button"
            underline="hover"
            sx={{ cursor: "pointer", font: "inherit" }}
            onClick={() => void refresh(address)}
          >
            Retry
          </Link>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      {error ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Section
        title="Claimable awards"
        description="Bounties where you are the awarded winner. Open a listing to claim the reward on-chain."
      >
        {data.claimable.length === 0 ? (
          <EmptyState
            title="Nothing to claim"
            message="When a creator awards you, the bounty appears here until you claim."
          />
        ) : (
          <BountyGrid items={data.claimable} />
        )}
      </Section>

      <Section
        title="Bounties you created"
        description="Escrows funded from your wallet, including open listings and expired bounties you can refund."
      >
        {data.created.length === 0 ? (
          <EmptyState
            title="No bounties yet"
            message="Publish a listing from Create and it will show up here after indexing."
            action={
              <Link component={NextLink} href="/create" underline="hover">
                Create a bounty
              </Link>
            }
          />
        ) : (
          <BountyGrid items={data.created} />
        )}
      </Section>

      <Section
        title="Your submissions"
        description="Work you submitted on-chain, newest first."
      >
        {data.submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            message="Submit work on a bounty detail page and it will appear here after indexing."
            action={
              <Link component={NextLink} href="/" underline="hover">
                Explore bounties
              </Link>
            }
          />
        ) : (
          <SubmissionList items={data.submissions} />
        )}
      </Section>
    </>
  );
}

/** Wallet-scoped dashboard: bounties you created, work you submitted, and awards to claim. */
export function DashboardView() {
  const { address, isConnected } = useConnection();

  if (!isConnected || !address) {
    return (
      <EmptyState
        title="Connect your wallet"
        message="Your dashboard lists bounties you created, submissions you sent, and rewards waiting to be claimed."
        action={<ConnectWallet />}
      />
    );
  }

  return <DashboardConnected key={address} address={address} />;
}
