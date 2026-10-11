"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { theme } from "./theme";

type AppThemeProviderProps = {
  children: ReactNode;
};

/** Theme, CSS baseline, and Next.js App Router Emotion cache for the web layout. */
export function AppThemeProvider({ children }: AppThemeProviderProps) {
  return (
    // App CSS (globals.css, CSS modules) is unlayered, so MUI stays in `@layer mui`.
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
