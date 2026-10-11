"use client";

import { ApiError, postBountyMetadata } from "@/lib/api";
import { getWebEnv } from "@/lib/env";
import { waitForIndexedBounty } from "@/lib/waitForIndexedBounty";
import { defaultChainId, wagmiConfig } from "@/wagmi/config";
import { METADATA_VERSION } from "@bounty/types";
import { bountyFactoryAbi } from "@bounty/types/contracts";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { parseEther, parseEventLogs } from "viem";
import {
  useChainId,
  useConnection,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";

type FieldErrors = Partial<
  Record<
    "title" | "description" | "reward" | "deadline" | "tags" | "links",
    string
  >
>;

type SubmitPhase = "idle" | "metadata" | "wallet" | "confirming" | "indexing";

function defaultDeadlineLocal(): string {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseTagList(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseLinkList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((link) => link.trim())
    .filter(Boolean);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateForm(input: {
  title: string;
  description: string;
  reward: string;
  deadline: string;
  tags: string;
  links: string;
}): {
  errors: FieldErrors;
  deadlineUnix?: number;
  rewardWei?: bigint;
  tags: string[];
  links: string[];
} {
  const errors: FieldErrors = {};
  const title = input.title.trim();
  const description = input.description.trim();
  const tags = parseTagList(input.tags);
  const links = parseLinkList(input.links);

  if (!title) {
    errors.title = "Title is required.";
  } else if (title.length > 200) {
    errors.title = "Title must be at most 200 characters.";
  }

  if (!description) {
    errors.description = "Description is required.";
  } else if (description.length > 10_000) {
    errors.description = "Description must be at most 10,000 characters.";
  }

  if (tags.length > 20) {
    errors.tags = "Use at most 20 tags.";
  } else if (tags.some((tag) => tag.length > 50)) {
    errors.tags = "Each tag must be at most 50 characters.";
  }

  if (links.length > 10) {
    errors.links = "Use at most 10 links.";
  } else if (links.some((link) => !isHttpUrl(link))) {
    errors.links = "Each link must be a valid http(s) URL.";
  }

  let rewardWei: bigint | undefined;
  try {
    rewardWei = parseEther(input.reward.trim() as `${number}`);
    if (rewardWei <= 0n) {
      errors.reward = "Reward must be greater than 0.";
    }
  } catch {
    errors.reward = "Enter a valid ETH amount.";
  }

  const deadlineUnix = Math.floor(new Date(input.deadline).getTime() / 1000);
  if (!input.deadline || !Number.isFinite(deadlineUnix)) {
    errors.deadline = "Choose a deadline.";
  } else if (deadlineUnix <= Math.floor(Date.now() / 1000)) {
    errors.deadline = "Deadline must be in the future.";
  }

  return { errors, deadlineUnix, rewardWei, tags, links };
}

function submitLabel(phase: SubmitPhase): string {
  switch (phase) {
    case "metadata":
      return "Saving metadata…";
    case "wallet":
      return "Confirm in wallet…";
    case "confirming":
      return "Waiting for confirmation…";
    case "indexing":
      return "Waiting for indexer…";
    default:
      return "Create bounty";
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Could not create the bounty.";
}

/** Metadata POST + payable `factory.createBounty`, then wait for the indexer. */
export function CreateBountyForm() {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();
  const { mutateAsync: writeContract } = useWriteContract();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("0.1");
  const [deadline, setDeadline] = useState(defaultDeadlineLocal());
  const [tags, setTags] = useState("");
  const [links, setLinks] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const wrongChain = isConnected && chainId !== defaultChainId;
  const busy = phase !== "idle";
  const canSubmit = !wrongChain && !busy;

  const factoryAddress = useMemo(() => {
    try {
      return getWebEnv().factoryAddress;
    } catch {
      return undefined;
    }
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = validateForm({
      title,
      description,
      reward,
      deadline,
      tags,
      links,
    });
    setFieldErrors(parsed.errors);
    if (
      Object.keys(parsed.errors).length > 0 ||
      parsed.deadlineUnix === undefined ||
      parsed.rewardWei === undefined
    ) {
      return;
    }

    if (!isConnected || !address) {
      setFormError("Connect a wallet to create a bounty.");
      return;
    }
    if (wrongChain) {
      setFormError(
        `Switch to chain ${defaultChainId} before creating a bounty.`,
      );
      return;
    }
    if (!factoryAddress) {
      setFormError(
        "Factory address is not configured. Check NEXT_PUBLIC_FACTORY_ADDRESS.",
      );
      return;
    }

    try {
      setPhase("metadata");
      const { uri } = await postBountyMetadata({
        version: METADATA_VERSION,
        title: title.trim(),
        description: description.trim(),
        tags: parsed.tags,
        links: parsed.links,
      });

      setPhase("wallet");
      const hash = await writeContract({
        address: factoryAddress,
        abi: bountyFactoryAbi,
        functionName: "createBounty",
        args: [BigInt(parsed.deadlineUnix), uri],
        value: parsed.rewardWei,
      });

      setPhase("confirming");
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      const created = parseEventLogs({
        abi: bountyFactoryAbi,
        eventName: "BountyCreated",
        logs: receipt.logs,
      })[0];
      const escrow = created?.args.escrow;
      if (!escrow) {
        throw new Error(
          "Transaction confirmed, but BountyCreated was not found.",
        );
      }

      setPhase("indexing");
      const indexed = await waitForIndexedBounty(escrow);
      router.push(indexed ? "/" : `/?created=${escrow}`);
    } catch (error) {
      setFormError(errorMessage(error));
      setPhase("idle");
    }
  }

  return (
    <Paper
      component="form"
      variant="outlined"
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      sx={{ maxWidth: 720, p: { xs: 2.5, md: 4 } }}
    >
      <Stack spacing={3}>
        {!isConnected ? (
          <Alert severity="info">
            Connect a wallet to fund and publish a bounty.
          </Alert>
        ) : null}
        {wrongChain ? (
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
        ) : null}
        {formError ? <Alert severity="error">{formError}</Alert> : null}

        <Box>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: "block", mb: 1.5 }}
          >
            Brief
          </Typography>
          <Stack spacing={2.5}>
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              error={Boolean(fieldErrors.title)}
              helperText={fieldErrors.title}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              error={Boolean(fieldErrors.description)}
              helperText={fieldErrors.description}
              required
              fullWidth
              multiline
              minRows={4}
            />
          </Stack>
        </Box>

        <Box>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: "block", mb: 1.5 }}
          >
            Reward
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 2.5,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            }}
          >
            <TextField
              label="Reward (ETH)"
              value={reward}
              onChange={(event) => setReward(event.target.value)}
              error={Boolean(fieldErrors.reward)}
              helperText={
                fieldErrors.reward ?? "Locked in escrow when you publish."
              }
              required
              fullWidth
              inputMode="decimal"
            />
            <TextField
              label="Deadline"
              type="datetime-local"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              error={Boolean(fieldErrors.deadline)}
              helperText={fieldErrors.deadline}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </Box>

        <Box>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: "block", mb: 1.5 }}
          >
            Optional
          </Typography>
          <Stack spacing={2.5}>
            <TextField
              label="Tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              error={Boolean(fieldErrors.tags)}
              helperText={
                fieldErrors.tags ?? "Comma-separated topics, e.g. solidity, ui."
              }
              fullWidth
            />
            <TextField
              label="Links"
              value={links}
              onChange={(event) => setLinks(event.target.value)}
              error={Boolean(fieldErrors.links)}
              helperText={fieldErrors.links ?? "Reference URLs, one per line."}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </Box>

        <Box>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!canSubmit}
          >
            {submitLabel(phase)}
          </Button>
          {busy ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {phase === "indexing"
                ? "Transaction confirmed. Waiting for the indexer to list it on Explore."
                : "Do not close this page until the transaction finishes."}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
}
