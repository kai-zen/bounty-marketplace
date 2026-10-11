import { BountyDetailError } from "@/components/BountyDetailError";
import { BountyDetailView } from "@/components/BountyDetailView";
import { loadBountyDetail } from "@/lib/load-bounty-detail";
import { EmptyState, PageHeader } from "@bounty/ui";
import Button from "@mui/material/Button";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

// A route `loading.tsx` flushes HTTP 200 before `notFound()` can set 404.

type BountyPageProps = {
  params: Promise<{ address: string }>;
};

export async function generateMetadata({
  params,
}: BountyPageProps): Promise<Metadata> {
  const { address } = await params;
  const data = await loadBountyDetail(address);
  if (data.status === "ok") {
    return { title: data.title };
  }
  if (data.status === "not-found") {
    return { title: "Bounty not found" };
  }
  if (data.status === "invalid") {
    return { title: "Invalid bounty" };
  }
  return { title: "Bounty" };
}

export default async function BountyPage({ params }: BountyPageProps) {
  const { address } = await params;
  const data = await loadBountyDetail(address);

  if (data.status === "invalid") {
    return (
      <EmptyState
        title="Invalid escrow address"
        message="Open a bounty from Explore, or use a 0x-prefixed 20-byte escrow address."
        action={
          <Button href="/" variant="contained">
            Back to explore
          </Button>
        }
      />
    );
  }

  if (data.status === "not-found") {
    notFound();
  }

  if (data.status === "error") {
    return (
      <>
        <PageHeader
          title="Bounty"
          subtitle="This listing could not be loaded from the API."
        />
        <BountyDetailError message={data.message} />
      </>
    );
  }

  return <BountyDetailView data={data} />;
}
