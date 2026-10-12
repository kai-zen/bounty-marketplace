"use client";

import {
  claimDisabledReason,
  hasAwardedWinner,
  sameAddress,
  winnerPayoutWei,
} from "@/lib/bounty-actions";
import { contractErrorText } from "@/lib/contract-error";
import { formatFeePercent, formatRewardEth } from "@/lib/format";
import { formatAddress } from "@/lib/formatAddress";
import { waitForIndexedBountyStatus } from "@/lib/waitForIndexedBountyStatus";
import { defaultChainId, wagmiConfig } from "@/wagmi/config";
import { BountyStatus, type Address } from "@bounty/types";
import { bountyEscrowAbi } from "@bounty/types/contracts";
import { fontFamilies } from "@bounty/ui";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseEventLogs } from "viem";
import {
  useChainId,
  useConnection,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";

type ClaimPhase = "idle" | "confirm" | "wallet" | "confirming" | "indexing";

type ClaimRewardPanelProps = {
  escrowAddress: Address;
  winner: Address | null;
  reward: string;
  platformFeeBps: number;
};

function claimButtonLabel(phase: ClaimPhase): string {
  switch (phase) {
    case "confirm":
      return "Confirm claim";
    case "wallet":
      return "Confirm in wallet…";
    case "confirming":
      return "Waiting for confirmation…";
    case "indexing":
      return "Waiting for indexer…";
    default:
      return "Claim reward";
  }
}

/** Winner calls `escrow.claimReward` once the bounty is awarded. */
export function ClaimRewardPanel({
  escrowAddress,
  winner,
  reward,
  platformFeeBps,
}: ClaimRewardPanelProps) {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();
  const { mutateAsync: writeContract } = useWriteContract();

  const [phase, setPhase] = useState<ClaimPhase>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const winnerAddress = hasAwardedWinner(winner) ? winner : null;
  const wrongChain = isConnected && chainId !== defaultChainId;
  const isWinner =
    Boolean(address) &&
    winnerAddress != null &&
    sameAddress(address ?? "", winnerAddress);
  const reason = claimDisabledReason({
    status: BountyStatus.Awarded,
    hasWinner: winnerAddress != null,
    isConnected,
    wrongChain,
    isWinner,
    expectedChainId: defaultChainId,
  });
  const busy = phase === "wallet" || phase === "confirming" || phase === "indexing";
  const payout = winnerPayoutWei(reward, platformFeeBps);

  async function sendClaim() {
    setFormError(null);
    setSuccess(null);

    const blocked = claimDisabledReason({
      status: BountyStatus.Awarded,
      hasWinner: winnerAddress != null,
      isConnected,
      wrongChain,
      isWinner,
      expectedChainId: defaultChainId,
    });
    if (blocked) {
      setFormError(blocked);
      setPhase("idle");
      return;
    }

    try {
      setPhase("wallet");
      const hash = await writeContract({
        address: escrowAddress,
        abi: bountyEscrowAbi,
        functionName: "claimReward",
      });

      setPhase("confirming");
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      if (receipt.status !== "success") {
        throw new Error("The claim transaction failed.");
      }
      const claimed = parseEventLogs({
        abi: bountyEscrowAbi,
        eventName: "RewardClaimed",
        logs: receipt.logs,
      })[0];
      if (!claimed) {
        throw new Error(
          "Transaction confirmed, but RewardClaimed was not found.",
        );
      }

      setPhase("indexing");
      let indexed = false;
      try {
        indexed = await waitForIndexedBountyStatus(
          escrowAddress,
          BountyStatus.Claimed,
        );
      } catch (error) {
        setFormError(
          `The transaction confirmed, but the bounty could not be checked. ${contractErrorText(error, "Refresh shortly.")}`,
        );
        setPhase("idle");
        router.refresh();
        return;
      }

      setSuccess(
        indexed
          ? "Reward claimed."
          : "The transaction confirmed, but the indexer has not updated this bounty yet. Refresh shortly.",
      );
      setPhase("idle");
      router.refresh();
    } catch (error) {
      setFormError(contractErrorText(error, "Could not claim the reward."));
      setPhase("idle");
    }
  }

  function onClaimClick() {
    setFormError(null);
    setSuccess(null);
    if (reason) {
      setFormError(reason);
      return;
    }
    setPhase("confirm");
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, mb: 2.5 }}>
      <Typography variant="overline" color="text.secondary">
        Claim reward
      </Typography>
      {winnerAddress ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Awarded to{" "}
          <Box
            component="span"
            title={winnerAddress}
            sx={{ fontFamily: fontFamilies.mono }}
          >
            {formatAddress(winnerAddress)}
          </Box>
          .
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          The winner has not been indexed yet.
        </Typography>
      )}
      {payout ? (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {isWinner ? "You receive" : "The winner receives"}{" "}
          {formatRewardEth(payout)} ETH after the {formatFeePercent(platformFeeBps)}{" "}
          platform fee.
        </Typography>
      ) : null}

      <Box sx={{ mt: 2 }}>
        {wrongChain && isWinner ? (
          <Alert
            severity="warning"
            sx={{ mb: 1.5 }}
            action={
              <Button
                color="inherit"
                size="small"
                disabled={isSwitching || busy}
                onClick={() => switchChain({ chainId: defaultChainId })}
              >
                Switch
              </Button>
            }
          >
            Wallet is on the wrong chain. Switch to {defaultChainId}.
          </Alert>
        ) : reason && phase !== "confirm" ? (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            {reason}
          </Alert>
        ) : null}
        {formError ? (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {formError}
          </Alert>
        ) : null}
        {success ? (
          <Alert severity="success" sx={{ mb: 1.5 }}>
            {success}
          </Alert>
        ) : null}

        {phase === "confirm" ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Button
              type="button"
              variant="contained"
              disabled={busy}
              onClick={() => void sendClaim()}
            >
              Confirm claim
            </Button>
            <Button
              type="button"
              color="inherit"
              disabled={busy}
              onClick={() => setPhase("idle")}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <Button
            type="button"
            variant={reason ? "outlined" : "contained"}
            disabled={Boolean(reason) || busy}
            title={reason ?? undefined}
            onClick={onClaimClick}
          >
            {claimButtonLabel(phase)}
          </Button>
        )}
        {busy ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {phase === "indexing"
              ? "Transaction confirmed. Waiting for the indexer to record the claim."
              : "Do not close this page until the transaction finishes."}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}
