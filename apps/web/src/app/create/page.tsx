import { CreateBountyForm } from "@/components/CreateBountyForm";
import { PageHeader } from "@bounty/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create bounty",
};

export default function CreatePage() {
  return (
    <>
      <PageHeader
        title="Create bounty"
        subtitle="Save metadata, then fund an escrow with factory.createBounty."
      />
      <CreateBountyForm />
    </>
  );
}
