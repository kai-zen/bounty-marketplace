"use client";

import {
  awardDisabledReason,
  sameAddress,
  type AwardGateInput,
} from "@/lib/bounty-actions";
import { contractErrorText } from "@/lib/contract-error";
import { waitForIndexedBountyStatus } from "@/lib/waitForIndexedBountyStatus";
import { defaultChainId, wagmiConfig } from "@/wagmi/config";
import {
  BountyStatus,
  SubmissionStatus,
  type Address,
} from "@bounty/types";
import { bountyEscrowAbi } from "@bounty/types/contracts";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { parseEventLogs } from "viem";
import {
  useChainId,
  useConnection,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";

type AwardPhase = "idle" | "confirm" | "wallet" | "confirming" | "indexing";

type AwardSession = {
  activeId: number | null;
  claim: (id: number) => boolean;
  release: (id: number) => void;
};

const AwardSessionContext = createContext<AwardSession | null>(null);

type AwardWinnerScopeProps = {
  creator: Address;
  deadlinePassed: boolean;
  children: ReactNode;
};

function awardButtonLabel(phase: AwardPhase): string {
  switch (phase) {
    case "confirm":
      return "Confirm award";
    case "wallet":
      return "Confirm in wallet…";
    case "confirming":
      return "Confirming…";
    case "indexing":
      return "Indexing…";
    default:
      return "Award";
  }
}

/** One in-flight award at a time, plus the reason the creator can or cannot award. */
export function AwardWinnerScope({
  creator,
  deadlinePassed,
  children,
}: AwardWinnerScopeProps) {
  const activeIdRef = useRef<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const claim = useCallback((id: number) => {
    if (activeIdRef.current !== null && activeIdRef.current !== id) {
      return false;
    }
    activeIdRef.current = id;
    setActiveId(id);
    return true;
  }, []);

  const release = useCallback((id: number) => {
    if (activeIdRef.current === id) {
      activeIdRef.current = null;
      setActiveId(null);
    }
  }, []);

  const session = useMemo(
    () => ({ activeId, claim, release }),
    [activeId, claim, release],
  );

  return (
    <AwardSessionContext.Provider value={session}>
      <Stack spacing={1.5}>
        <AwardWinnerNotice creator={creator} deadlinePassed={deadlinePassed} />
        {children}
      </Stack>
    </AwardSessionContext.Provider>
  );
}

function AwardWinnerNotice({
  creator,
  deadlinePassed,
}: {
  creator: Address;
  deadlinePassed: boolean;
}) {
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();

  const wrongChain = isConnected && chainId !== defaultChainId;
  const isCreator = Boolean(address) && sameAddress(address ?? "", creator);
  const reason = awardDisabledReason({
    status: BountyStatus.Open,
    deadlinePassed,
    isConnected,
    wrongChain,
    isCreator,
    submissionStatus: SubmissionStatus.Pending,
    expectedChainId: defaultChainId,
  });

  if (deadlinePassed) {
    return (
      <Alert severity="info">
        {reason ?? "The deadline has passed, so a winner cannot be awarded."}
      </Alert>
    );
  }

  if (wrongChain && isCreator) {
    return (
      <Alert
        severity="warning"
        action={
          <Button
            color="inherit"
            size="small"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: defaultChainId })}
          >
            Switch
          </Button>
        }
      >
        Wallet is on the wrong chain. Switch to {defaultChainId}.
      </Alert>
    );
  }

  if (!reason) {
    return (
      <Typography variant="body2" color="text.secondary">
        Award one submission. The winner can then claim the escrowed reward.
      </Typography>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      {reason}
    </Typography>
  );
}

type AwardWinnerButtonProps = {
  escrowAddress: Address;
  creator: Address;
  deadline: number;
  deadlinePassed: boolean;
  bountyStatus: BountyStatus;
  submissionId: number;
  submitter: Address;
  submissionStatus: SubmissionStatus;
};

/** Creator calls `escrow.awardWinner` for one pending submission. */
export function AwardWinnerButton({
  escrowAddress,
  creator,
  deadline,
  deadlinePassed,
  bountyStatus,
  submissionId,
  submitter,
  submissionStatus,
}: AwardWinnerButtonProps) {
  const router = useRouter();
  const session = useContext(AwardSessionContext);
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const { mutateAsync: writeContract } = useWriteContract();

  const [phase, setPhase] = useState<AwardPhase>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const wrongChain = isConnected && chainId !== defaultChainId;
  const isCreator = Boolean(address) && sameAddress(address ?? "", creator);
  const gate: AwardGateInput = {
    status: bountyStatus,
    deadlinePassed,
    isConnected,
    wrongChain,
    isCreator,
    submissionStatus,
    expectedChainId: defaultChainId,
  };
  const reason = awardDisabledReason(gate);
  const lockedOut =
    session != null &&
    session.activeId !== null &&
    session.activeId !== submissionId;
  const busy = phase === "wallet" || phase === "confirming" || phase === "indexing";
  const release = () => session?.release(submissionId);

  async function sendAward() {
    setFormError(null);
    setSuccess(null);

    const blocked = awardDisabledReason({
      ...gate,
      deadlinePassed: deadline * 1000 <= Date.now(),
    });
    if (blocked) {
      setFormError(blocked);
      setPhase("idle");
      release();
      return;
    }
    if (!Number.isSafeInteger(submissionId) || submissionId < 0) {
      setFormError("This submission cannot be awarded.");
      setPhase("idle");
      release();
      return;
    }

    try {
      setPhase("wallet");
      const hash = await writeContract({
        address: escrowAddress,
        abi: bountyEscrowAbi,
        functionName: "awardWinner",
        args: [submitter, BigInt(submissionId)],
      });

      setPhase("confirming");
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      if (receipt.status !== "success") {
        throw new Error("The award transaction failed.");
      }
      const awarded = parseEventLogs({
        abi: bountyEscrowAbi,
        eventName: "WinnerAwarded",
        logs: receipt.logs,
      })[0];
      if (!awarded || Number(awarded.args.submissionId) !== submissionId) {
        throw new Error(
          "Transaction confirmed, but WinnerAwarded was not found.",
        );
      }

      setPhase("indexing");
      let indexed = false;
      try {
        indexed = await waitForIndexedBountyStatus(
          escrowAddress,
          BountyStatus.Awarded,
          { winningSubmissionId: submissionId },
        );
      } catch (error) {
        setFormError(
          `The transaction confirmed, but the bounty could not be checked. ${contractErrorText(error, "Refresh shortly.")}`,
        );
        setPhase("idle");
        release();
        router.refresh();
        return;
      }

      setSuccess(
        indexed
          ? "Winner awarded."
          : "The transaction confirmed, but the indexer has not updated this bounty yet. Refresh shortly.",
      );
      setPhase("idle");
      release();
      router.refresh();
    } catch (error) {
      setFormError(contractErrorText(error, "Could not award a winner."));
      setPhase("idle");
      release();
    }
  }

  function onAwardClick() {
    setFormError(null);
    setSuccess(null);
    const blocked = awardDisabledReason({
      ...gate,
      deadlinePassed: deadline * 1000 <= Date.now(),
    });
    if (blocked) {
      setFormError(blocked);
      return;
    }
    if (session && !session.claim(submissionId)) {
      return;
    }
    setPhase("confirm");
  }

  function onCancel() {
    setPhase("idle");
    release();
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: { xs: "flex-start", sm: "flex-end" },
        gap: 0.75,
        maxWidth: "100%",
      }}
    >
      {phase === "confirm" ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button
            type="button"
            size="small"
            variant="contained"
            disabled={busy}
            aria-label={`Confirm award for submission ${submissionId}`}
            onClick={() => void sendAward()}
          >
            Confirm award
          </Button>
          <Button
            type="button"
            size="small"
            color="inherit"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </Box>
      ) : (
        <Button
          type="button"
          size="small"
          variant={reason || lockedOut ? "outlined" : "contained"}
          disabled={Boolean(reason) || lockedOut || busy}
          title={reason ?? (lockedOut ? "Another award is in progress." : undefined)}
          aria-label={`Award submission ${submissionId}`}
          onClick={onAwardClick}
        >
          {awardButtonLabel(phase)}
        </Button>
      )}
      {busy ? (
        <Typography variant="caption" color="text.secondary">
          {phase === "indexing"
            ? "Waiting for the indexer to record the award."
            : "Do not close this page until the transaction finishes."}
        </Typography>
      ) : null}
      {formError ? (
        <Typography
          variant="caption"
          color="error"
          role="alert"
          sx={{ maxWidth: 280, textAlign: { sm: "right" } }}
        >
          {formError}
        </Typography>
      ) : null}
      {success ? (
        <Typography
          variant="caption"
          color="success.main"
          role="status"
          sx={{ maxWidth: 280, textAlign: { sm: "right" } }}
        >
          {success}
        </Typography>
      ) : null}
    </Box>
  );
}
