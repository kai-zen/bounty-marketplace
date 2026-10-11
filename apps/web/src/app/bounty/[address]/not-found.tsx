import { EmptyState } from "@bounty/ui";
import Button from "@mui/material/Button";

export default function BountyNotFound() {
  return (
    <EmptyState
      title="Bounty not found"
      message="This escrow is not in the index yet, or the address does not match a bounty."
      action={
        <Button href="/" variant="contained">
          Back to explore
        </Button>
      }
    />
  );
}
