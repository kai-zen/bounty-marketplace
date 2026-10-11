import { ExploreBounties } from "@/components/ExploreBounties";
import { PageHeader } from "@bounty/ui";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import type { Metadata } from "next";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore",
};

function ExploreLoading() {
  return (
    <Box
      sx={{ display: "flex", justifyContent: "center", py: 8 }}
      role="status"
      aria-live="polite"
      aria-label="Loading bounties"
    >
      <CircularProgress />
    </Box>
  );
}

export default function Home() {
  return (
    <>
      <PageHeader
        title="Explore"
        subtitle="Browse indexed bounties from the marketplace."
      />
      <Suspense fallback={<ExploreLoading />}>
        <ExploreBounties />
      </Suspense>
    </>
  );
}
