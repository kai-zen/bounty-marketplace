import { SubmitWorkForm } from "@/components/SubmitWorkForm";
import { formatAddress } from "@/lib/formatAddress";
import {
  formatFeePercent,
  formatRewardEth,
  formatUnixDateTime,
} from "@/lib/format";
import type { BountyDetailData } from "@/lib/load-bounty-detail";
import {
  type ActivityEvent,
  type ActivityEventType,
  BountyStatus,
  type SubmissionSummary,
} from "@bounty/types";
import { EmptyState, PageHeader, StatusChip, fontFamilies } from "@bounty/ui";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const ACTIVITY_LABELS: Record<ActivityEventType, string> = {
  BountyCreated: "Bounty created",
  WorkSubmitted: "Work submitted",
  SubmissionSelected: "Submission selected",
  WinnerAwarded: "Winner awarded",
  RewardClaimed: "Reward claimed",
  BountyRefunded: "Bounty refunded",
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}

function linkLabel(href: string): string {
  try {
    const url = new URL(href);
    const path = `${url.hostname}${url.pathname}`.replace(/\/$/, "");
    return path.length > 56 ? `${path.slice(0, 53)}…` : path || href;
  } catch {
    return href;
  }
}

function hasWinner(winner: string | null): winner is string {
  return (
    winner != null && winner.length > 0 && winner.toLowerCase() !== ZERO_ADDRESS
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography
        component="dd"
        variant="body2"
        sx={{
          m: 0,
          mt: 0.25,
          fontFamily: fontFamilies.mono,
          wordBreak: "break-all",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function BriefSection({ data }: { data: BountyDetailData }) {
  const { bounty, metadata } = data;
  const description = metadata?.description.trim() ?? "";
  const tags = metadata?.tags.map((tag) => tag.trim()).filter(Boolean) ?? [];
  const links = (metadata?.links ?? [])
    .map((link) => {
      const href = safeHttpUrl(link.trim());
      return href ? { href, label: linkLabel(href) } : null;
    })
    .filter((link): link is { href: string; label: string } => link !== null);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 } }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", mb: 1.5 }}
      >
        Brief
      </Typography>
      {description ? (
        <Typography
          variant="body1"
          sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
        >
          {description}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {metadata
            ? "This brief has no description."
            : bounty.title.trim()
              ? "The indexed title is available, but the brief could not be loaded from the metadata URI."
              : "No brief is stored for this bounty."}
        </Typography>
      )}
      {tags.length > 0 ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2.5 }}>
          {tags.map((tag, index) => (
            <Chip
              key={`${tag}-${index}`}
              label={tag}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      ) : null}
      {links.length > 0 ? (
        <Stack
          component="ul"
          spacing={0.75}
          sx={{ listStyle: "none", m: 0, mt: 2.5, p: 0 }}
        >
          {links.map((link) => (
            <Typography key={link.href} component="li" variant="body2">
              <Link href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </Link>
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Paper>
  );
}

function DetailsSection({ data }: { data: BountyDetailData }) {
  const { bounty } = data;

  const now = new Date().getTime();
  const passed =
    bounty.status === BountyStatus.Open && bounty.deadline * 1000 <= now;
  const winner = hasWinner(bounty.winner) ? bounty.winner : null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 } }}>
      <Typography variant="overline" color="text.secondary">
        Reward
      </Typography>
      <Typography
        sx={{
          mt: 0.5,
          fontFamily: fontFamilies.mono,
          fontSize: { xs: "1.6rem", sm: "1.85rem" },
          fontWeight: 650,
          color: "secondary.main",
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          wordBreak: "break-all",
        }}
      >
        {formatRewardEth(bounty.reward)}
        <Box
          component="span"
          sx={{
            ml: 0.75,
            fontSize: "0.75rem",
            fontWeight: 650,
            letterSpacing: "0.06em",
            color: "text.secondary",
          }}
        >
          ETH
        </Box>
      </Typography>
      <Divider sx={{ my: 2.25 }} />
      <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.75 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" component="dt">
            Deadline
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, mt: 0.25 }}>
            {formatUnixDateTime(bounty.deadline)}
          </Typography>
          {passed ? (
            <Typography
              variant="caption"
              color="error.main"
              sx={{ display: "block", mt: 0.25 }}
            >
              Deadline passed
            </Typography>
          ) : null}
        </Box>
        <Fact label="Creator" value={bounty.creator} />
        <Fact label="Escrow" value={bounty.escrowAddress} />
        {winner ? <Fact label="Winner" value={winner} /> : null}
        {bounty.winningSubmissionId != null ? (
          <Fact
            label="Winning submission"
            value={`#${bounty.winningSubmissionId}`}
          />
        ) : null}
        <Fact
          label="Platform fee"
          value={formatFeePercent(bounty.platformFeeBps)}
        />
        <Fact label="Metadata" value={bounty.metadataURI} />
        <Fact label="Created in" value={bounty.createdTxHash} />
        <Fact label="Created block" value={String(bounty.createdBlockNumber)} />
      </Box>
    </Paper>
  );
}

function SubmissionRow({
  submission,
  awarded,
}: {
  submission: SubmissionSummary;
  awarded: boolean;
}) {
  const title =
    submission.title.trim() || `Submission #${submission.submissionId}`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: 1.5,
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        borderColor: awarded ? "primary.light" : "divider",
        bgcolor: awarded ? "rgba(31, 77, 58, 0.05)" : "background.paper",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" component="h3">
          {title}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5, wordBreak: "break-all" }}
        >
          {formatAddress(submission.submitter)} · #{submission.submissionId}
          {awarded ? " · Awarded winner" : ""}
        </Typography>
      </Box>
      <StatusChip kind="submission" status={submission.status} />
    </Paper>
  );
}

function SubmissionsSection({ data }: { data: BountyDetailData }) {
  const { bounty, submissions } = data;
  const hidden = Math.max(0, submissions.total - submissions.items.length);

  const now = new Date().getTime();
  const acceptingWork =
    bounty.status === BountyStatus.Open && bounty.deadline * 1000 > now;

  return (
    <Box component="section" aria-labelledby="bounty-submissions-heading">
      <Typography id="bounty-submissions-heading" variant="h6" sx={{ mb: 1.5 }}>
        Submissions
      </Typography>
      {acceptingWork ? (
        <Box sx={{ mb: 2.5 }}>
          <SubmitWorkForm
            escrowAddress={bounty.escrowAddress}
            creator={bounty.creator}
            registryAddress={bounty.submissionRegistry}
            deadline={bounty.deadline}
          />
        </Box>
      ) : null}
      {submissions.items.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          message={
            acceptingWork
              ? "Send your write-up above. It shows up here after the indexer records the transaction."
              : "Work submitted on-chain shows up here after the indexer records it."
          }
        />
      ) : (
        <Stack spacing={1.5}>
          {submissions.items.map((submission) => (
            <SubmissionRow
              key={submission.submissionId}
              submission={submission}
              awarded={
                bounty.winningSubmissionId != null &&
                submission.submissionId === bounty.winningSubmissionId
              }
            />
          ))}
          {hidden > 0 ? (
            <Typography variant="body2" color="text.secondary">
              Showing {submissions.items.length} of {submissions.total}{" "}
              submissions.
            </Typography>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}

function activityDetail(event: ActivityEvent): string {
  const actor = formatAddress(event.actor);
  if (event.submissionId != null) {
    return `${actor} · #${event.submissionId}`;
  }
  return actor;
}

function ActivitySection({ data }: { data: BountyDetailData }) {
  const { activity } = data;

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-labelledby="bounty-activity-heading"
      sx={{ p: { xs: 2.5, md: 3 } }}
    >
      <Typography
        id="bounty-activity-heading"
        variant="overline"
        color="text.secondary"
      >
        Activity
      </Typography>
      {activity.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          No activity has been indexed for this escrow yet.
        </Typography>
      ) : (
        <Box component="ol" sx={{ listStyle: "none", m: 0, mt: 2, p: 0 }}>
          {activity.map((event, index) => (
            <Box
              component="li"
              key={`${event.txHash}-${event.type}-${event.submissionId ?? "x"}-${index}`}
              sx={{
                display: "grid",
                gridTemplateColumns: "16px minmax(0, 1fr)",
                columnGap: 1.5,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 10,
                    height: 10,
                    mt: 0.7,
                    borderRadius: "50%",
                    bgcolor:
                      index === activity.length - 1
                        ? "secondary.main"
                        : "primary.main",
                    flexShrink: 0,
                  }}
                />
                {index < activity.length - 1 ? (
                  <Box
                    aria-hidden
                    sx={{ width: "1px", flex: 1, bgcolor: "divider", my: 0.5 }}
                  />
                ) : null}
              </Box>
              <Box
                sx={{ pb: index < activity.length - 1 ? 2 : 0, minWidth: 0 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {ACTIVITY_LABELS[event.type] ?? event.type}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.25 }}
                >
                  {formatUnixDateTime(event.timestamp)} ·{" "}
                  {activityDetail(event)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  title={event.txHash}
                  sx={{ display: "block", mt: 0.25, wordBreak: "break-all" }}
                >
                  {formatAddress(event.txHash, 6)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}

/** Bounty detail: brief, escrow facts, submit-work form, submissions, and activity. */
export function BountyDetailView({ data }: { data: BountyDetailData }) {
  return (
    <>
      <Button
        href="/"
        color="inherit"
        size="small"
        sx={{ mb: 2, px: 1.25, color: "text.secondary" }}
      >
        Back to explore
      </Button>
      <PageHeader
        title={data.title}
        actions={<StatusChip kind="bounty" status={data.bounty.status} />}
      />
      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          alignItems: "start",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 1.45fr) minmax(280px, 0.85fr)",
          },
        }}
      >
        <Stack spacing={2.5} sx={{ order: { xs: 2, md: 1 }, minWidth: 0 }}>
          <BriefSection data={data} />
          <SubmissionsSection data={data} />
          <ActivitySection data={data} />
        </Stack>
        <Box
          sx={{
            order: { xs: 1, md: 2 },
            minWidth: 0,
            position: { md: "sticky" },
            top: { md: 88 },
          }}
        >
          <DetailsSection data={data} />
        </Box>
      </Box>
    </>
  );
}
