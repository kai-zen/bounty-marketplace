"use client";

import { waitForIndexedBounty } from "@/lib/waitForIndexedBounty";
import Alert from "@mui/material/Alert";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type ExploreCreatedPollProps = {
  escrow: string;
};

/** After create, poll until the indexer has the new bounty, then refresh Explore. */
export function ExploreCreatedPoll({ escrow }: ExploreCreatedPollProps) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void waitForIndexedBounty(escrow).then((indexed) => {
      if (cancelled) {
        return;
      }
      setWaiting(false);
      if (indexed) {
        router.replace("/");
        router.refresh();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [escrow, router]);

  if (!waiting) {
    return null;
  }

  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      Waiting for the indexer to list the new bounty…
    </Alert>
  );
}
