import { fetchBounties, fetchHealth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  let apiMessage = "API unreachable — start the backend (`pnpm dev:api`) and check NEXT_PUBLIC_API_URL.";

  try {
    const [health, bounties] = await Promise.all([fetchHealth(), fetchBounties()]);
    const healthLabel = health.status === "ok" ? "healthy" : health.status;
    apiMessage = `API ${healthLabel}; ${bounties.total} indexed bounties.`;
  } catch {
    // Keep default apiMessage.
  }

  return (
    <div>
      <p style={{ margin: 0, color: "var(--foreground, #666)" }}>
        Explore bounties — list view coming in the next step.
      </p>
      <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", color: "#888" }}>
        {apiMessage}
      </p>
    </div>
  );
}
