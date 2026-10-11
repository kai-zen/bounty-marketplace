"use client";

import { Web3Providers } from "@/wagmi/Web3Providers";
import { AppShell, AppThemeProvider } from "@bounty/ui";
import type { ReactNode } from "react";
import { ConnectWallet } from "./ConnectWallet";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Web3Providers>
      <AppThemeProvider>
        <AppShell headerActions={<ConnectWallet />}>{children}</AppShell>
      </AppThemeProvider>
    </Web3Providers>
  );
}
