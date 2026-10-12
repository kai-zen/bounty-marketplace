"use client";

import { refundDisabledReason, sameAddress } from "@/lib/bounty-actions";
import { contractErrorText } from "@/lib/contract-error";
import { formatRewardEth } from "@/lib/format";
import { waitForIndexedBountyStatus } from "@/lib/waitForIndexedBountyStatus";
import { defaultChainId, wagmiConfig } from "@/wagmi/config";
import { BountyStatus, type Address } from "@bounty/types";
import { bountyEscrowAbi } from "@bounty/types/contracts";
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

type RefundPhase = "idle" | "confirm" | "wallet" | "confirming" | "indexing";

type RefundExpiredPanelProps = {
  escrowAddress: Address;
  creator: Address;
  reward: string;
  deadline: number;
};

function refundButtonLabel(phase: RefundPhase): string {
  switch (phase) {
    case "confirm":
      return "Confirm refund";
    case "wallet":
      return "Confirm in wallet…";
    case "confirming":
      return "Waiting for confirmation…";
    case "indexing":
      return "Waiting for indexer…";
    default:
      return "Refund escrow";
  }
}

/** Creator calls `escrow.refundExpired` after the deadline while the bounty is still open. */
export function RefundExpiredPanel({
  escrowAddress,
  creator,
  reward,
  deadline,
}: RefundExpiredPanelProps) {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();
  const { mutateAsync: writeContract } = useWriteContract();

  const [phase, setPhase] = useState<RefundPhase>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const now = new Date().getTime();
  const deadlinePassed = deadline * 1000 <= now;
  const wrongChain = isConnected && chainId !== defaultChainId;
  const isCreator = Boolean(address) && sameAddress(address ?? "", creator);
  const reason = refundDisabledReason({
    status: BountyStatus.Open,
    deadlinePassed,
    isConnected,
    wrongChain,
    isCreator,
    expectedChainId: defaultChainId,
  });
  const busy =
    phase === "wallet" || phase === "confirming" || phase === "indexing";

  async function sendRefund() {
    setFormError(null);
    setSuccess(null);

    const blocked = refundDisabledReason({
      status: BountyStatus.Open,
      deadlinePassed,
      isConnected,
      wrongChain,
      isCreator,
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
        functionName: "refundExpired",
      });

      setPhase("confirming");
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      if (receipt.status !== "success") {
        throw new Error("The refund transaction failed.");
      }
      const refunded = parseEventLogs({
        abi: bountyEscrowAbi,
        eventName: "BountyRefunded",
        logs: receipt.logs,
      })[0];
      if (!refunded) {
        throw new Error(
          "Transaction confirmed, but BountyRefunded was not found.",
        );
      }

      setPhase("indexing");
      let indexed = false;
      try {
        indexed = await waitForIndexedBountyStatus(
          escrowAddress,
          BountyStatus.Refunded,
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
          ? "Escrow refunded to the creator."
          : "The transaction confirmed, but the indexer has not updated this bounty yet. Refresh shortly.",
      );
      setPhase("idle");
      router.refresh();
    } catch (error) {
      setFormError(contractErrorText(error, "Could not refund the escrow."));
      setPhase("idle");
    }
  }

  function onRefundClick() {
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
        Refund expired bounty
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        The deadline has passed with no winner. The creator can recover the full{" "}
        {formatRewardEth(reward)} ETH reward from escrow.
      </Typography>

      <Box sx={{ mt: 2 }}>
        {wrongChain && isCreator ? (
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
              onClick={() => void sendRefund()}
            >
              Confirm refund
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
            onClick={onRefundClick}
          >
            {refundButtonLabel(phase)}
          </Button>
        )}
        {busy ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {phase === "indexing"
              ? "Transaction confirmed. Waiting for the indexer to record the refund."
              : "Do not close this page until the transaction finishes."}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}
