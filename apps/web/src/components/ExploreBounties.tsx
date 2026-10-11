import { ApiError, fetchBounties } from "@/lib/api";
import { BountyCard, EmptyState } from "@bounty/ui";
import Box from "@mui/material/Box";
import { ExploreError } from "./ExploreError";

const EXPLORE_PAGE_SIZE = 24;

function exploreErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Could not load bounties. Start the API and check NEXT_PUBLIC_API_URL.";
}

/** Server-fetched bounty list: error, empty, or BountyCard grid. */
export async function ExploreBounties() {
  let result;
  try {
    result = await fetchBounties({ limit: EXPLORE_PAGE_SIZE });
  } catch (error) {
    return <ExploreError message={exploreErrorMessage(error)} />;
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="No bounties yet"
        message="Indexed bounties will appear here after they are created on-chain."
      />
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
        },
      }}
    >
      {result.items.map((bounty) => (
        <BountyCard
          key={bounty.escrowAddress}
          bounty={bounty}
          href={`/bounty/${bounty.escrowAddress}`}
        />
      ))}
    </Box>
  );
}
