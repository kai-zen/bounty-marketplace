"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useRouter } from "next/navigation";

export type BountyDetailErrorProps = {
  message: string;
};

/** Error panel for the bounty detail page with a refresh retry. */
export function BountyDetailError({ message }: BountyDetailErrorProps) {
  const router = useRouter();

  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={() => router.refresh()}>
          Retry
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
