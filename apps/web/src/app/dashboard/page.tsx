import { DashboardView } from "@/components/DashboardView";
import { PageHeader } from "@bounty/ui";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Track bounties you fund, work you submit, and rewards ready to claim."
      />
      <DashboardView />
    </>
  );
}
