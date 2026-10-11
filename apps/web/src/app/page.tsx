import { ExploreBounties } from "@/components/ExploreBounties";
import { ExploreCreatedPoll } from "@/components/ExploreCreatedPoll";
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

type HomeProps = {
  searchParams: Promise<{ created?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { created } = await searchParams;

  return (
    <>
      <PageHeader
        title="Explore"
        subtitle="Browse indexed bounties from the marketplace."
      />
      {created ? <ExploreCreatedPoll escrow={created} /> : null}
      <Suspense fallback={<ExploreLoading />}>
        <ExploreBounties />
      </Suspense>
    </>
  );
}
