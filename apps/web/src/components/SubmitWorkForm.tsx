"use client";

import { ApiError, postSubmissionMetadata } from "@/lib/api";
import { waitForIndexedSubmission } from "@/lib/waitForIndexedSubmission";
import { defaultChainId, wagmiConfig } from "@/wagmi/config";
import { METADATA_VERSION, type Address } from "@bounty/types";
import { submissionRegistryAbi } from "@bounty/types/contracts";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { parseEventLogs } from "viem";
import {
  useChainId,
  useConnection,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type FieldErrors = Partial<
  Record<"title" | "description" | "tags" | "links", string>
>;

type SubmitPhase = "idle" | "metadata" | "wallet" | "confirming" | "indexing";

type SubmitWorkFormProps = {
  escrowAddress: Address;
  creator: Address;
  registryAddress: Address;
  deadline: number;
};

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
  tags: string;
  links: string;
}): { errors: FieldErrors; tags: string[]; links: string[] } {
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

  return { errors, tags, links };
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
      return "Submit work";
  }
}

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

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

  const combined = parts.join("\n");
  if (combined.includes("creator cannot submit")) {
    return "The bounty creator cannot submit work on this escrow.";
  }
  if (combined.includes("bounty expired")) {
    return "This bounty is past its deadline.";
  }
  if (combined.includes("bounty not open")) {
    return "This bounty is no longer open.";
  }
  if (/user rejected the request/i.test(combined)) {
    return "The wallet rejected the transaction.";
  }

  const short = parts.find((part) => part.length > 0 && part.length < 280);
  return short || "Could not submit work.";
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

/** Metadata POST + `registry.submitWork`, then wait until the submission is indexed. */
export function SubmitWorkForm({
  escrowAddress,
  creator,
  registryAddress,
  deadline,
}: SubmitWorkFormProps) {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();
  const { mutateAsync: writeContract } = useWriteContract();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [links, setLinks] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const wrongChain = isConnected && chainId !== defaultChainId;
  const isCreator = Boolean(address) && sameAddress(address ?? "", creator);
  const registryReady =
    /^0x[a-fA-F0-9]{40}$/.test(registryAddress) &&
    !sameAddress(registryAddress, ZERO_ADDRESS);
  const busy = phase !== "idle";

  const now = new Date().getTime();
  const closed = deadline * 1000 <= now;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (deadline * 1000 <= Date.now()) {
      setFormError("This bounty is past its deadline.");
      return;
    }

    const parsed = validateForm({ title, description, tags, links });
    setFieldErrors(parsed.errors);
    if (Object.keys(parsed.errors).length > 0) {
      return;
    }

    if (!isConnected || !address) {
      return;
    }
    if (sameAddress(address, creator)) {
      setFormError("The bounty creator cannot submit work on this escrow.");
      return;
    }
    if (wrongChain) {
      setFormError(`Switch to chain ${defaultChainId} before submitting work.`);
      return;
    }
    if (!registryReady) {
      setFormError("This bounty has no submission registry address.");
      return;
    }

    try {
      setPhase("metadata");
      const { uri } = await postSubmissionMetadata({
        version: METADATA_VERSION,
        title: title.trim(),
        description: description.trim(),
        tags: parsed.tags,
        links: parsed.links,
      });

      setPhase("wallet");
      const hash = await writeContract({
        address: registryAddress,
        abi: submissionRegistryAbi,
        functionName: "submitWork",
        args: [escrowAddress, uri],
      });

      setPhase("confirming");
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      const submitted = parseEventLogs({
        abi: submissionRegistryAbi,
        eventName: "WorkSubmitted",
        logs: receipt.logs,
      })[0];
      const submissionId = submitted
        ? Number(submitted.args.submissionId)
        : NaN;
      if (!Number.isSafeInteger(submissionId)) {
        throw new Error(
          "Transaction confirmed, but WorkSubmitted was not found.",
        );
      }

      setPhase("indexing");
      let indexed = false;
      try {
        indexed = await waitForIndexedSubmission(escrowAddress, submissionId);
      } catch (error) {
        setTitle("");
        setDescription("");
        setTags("");
        setLinks("");
        setFieldErrors({});
        setFormError(
          `The transaction confirmed, but the submission list could not be checked. ${errorText(error)}`,
        );
        setPhase("idle");
        router.refresh();
        return;
      }

      setTitle("");
      setDescription("");
      setTags("");
      setLinks("");
      setFieldErrors({});
      setSuccess(
        indexed
          ? "Your submission is in the list."
          : "The transaction confirmed, but the indexer has not listed it yet. Refresh shortly.",
      );
      setPhase("idle");
      router.refresh();
    } catch (error) {
      setFormError(errorText(error));
      setPhase("idle");
    }
  }

  if (closed) {
    return (
      <Alert severity="info">
        The deadline has passed, so new work cannot be submitted.
      </Alert>
    );
  }

  if (isCreator) {
    return (
      <Alert severity="info">
        You posted this bounty, so this wallet cannot submit work on it.
      </Alert>
    );
  }

  return (
    <Paper
      component="form"
      variant="outlined"
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      sx={{ p: { xs: 2.5, md: 3 } }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Submit work
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Describe what you shipped. Your wallet then records the write-up on
            the submission registry.
          </Typography>
        </Box>

        {!isConnected ? (
          <Alert severity="info">Connect a wallet to submit work.</Alert>
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
        {success ? <Alert severity="success">{success}</Alert> : null}

        <TextField
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={Boolean(fieldErrors.title)}
          helperText={fieldErrors.title}
          required
          fullWidth
          disabled={busy}
        />
        <TextField
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          error={Boolean(fieldErrors.description)}
          helperText={
            fieldErrors.description ?? "What you built and how to review it."
          }
          required
          fullWidth
          multiline
          minRows={4}
          disabled={busy}
        />
        <TextField
          label="Tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          error={Boolean(fieldErrors.tags)}
          helperText={fieldErrors.tags ?? "Comma-separated, optional."}
          fullWidth
          disabled={busy}
        />
        <TextField
          label="Links"
          value={links}
          onChange={(event) => setLinks(event.target.value)}
          error={Boolean(fieldErrors.links)}
          helperText={
            fieldErrors.links ?? "Pull request or demo URLs, one per line."
          }
          fullWidth
          multiline
          minRows={2}
          disabled={busy}
        />

        <Box>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={busy || wrongChain || !registryReady}
          >
            {submitLabel(phase)}
          </Button>
          {busy ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {phase === "indexing"
                ? "Transaction confirmed. Waiting for the indexer to add it to this bounty."
                : "Do not close this page until the transaction finishes."}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
}
