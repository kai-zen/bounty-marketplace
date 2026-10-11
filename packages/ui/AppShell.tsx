"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type AppShellNavItem = {
  label: string;
  href: string;
};

const DEFAULT_NAV_ITEMS: AppShellNavItem[] = [
  { label: "Explore", href: "/" },
  { label: "Create", href: "/create" },
  { label: "Dashboard", href: "/dashboard" },
];

export type AppShellProps = {
  children: ReactNode;
  /** Right side of the app bar (e.g. wallet connect). */
  headerActions?: ReactNode;
  navItems?: AppShellNavItem[];
  brandHref?: string;
  brandTitle?: string;
};

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Root layout chrome: top app bar, primary nav, and main content area. */
export function AppShell({
  children,
  headerActions,
  navItems = DEFAULT_NAV_ITEMS,
  brandHref = "/",
  brandTitle = "Bounty Marketplace",
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            component={Link}
            href={brandHref}
            variant="h6"
            sx={{
              color: "inherit",
              textDecoration: "none",
              fontWeight: 700,
              mr: 1,
            }}
          >
            {brandTitle}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5, flexGrow: 1 }}>
            {navItems.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  color="inherit"
                  variant={active ? "outlined" : "text"}
                  sx={{
                    borderColor: active ? "rgba(255,255,255,0.5)" : "transparent",
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>
          {headerActions ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {headerActions}
            </Box>
          ) : null}
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ flex: 1, py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
