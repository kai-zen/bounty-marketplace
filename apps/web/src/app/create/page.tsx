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
        title="Fund a bounty"
        subtitle="Write the brief, lock a reward, and publish it on-chain. The escrow holds the funds until you award a winner."
      />
      <CreateBountyForm />
    </>
  );
}
