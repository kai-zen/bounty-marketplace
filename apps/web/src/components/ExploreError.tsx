"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useRouter } from "next/navigation";

export type ExploreErrorProps = {
  message: string;
};

/** Error panel for the Explore list with a refresh retry. */
export function ExploreError({ message }: ExploreErrorProps) {
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
