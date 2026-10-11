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

function NavButton({ item, active }: { item: AppShellNavItem; active: boolean }) {
  return (
    <Button
      component={Link}
      href={item.href}
      color="inherit"
      sx={{
        px: 1.5,
        color: active ? "text.primary" : "text.secondary",
        bgcolor: active ? "action.selected" : "transparent",
        fontWeight: active ? 700 : 560,
        "&:hover": {
          bgcolor: active ? "action.selected" : "action.hover",
        },
      }}
    >
      {item.label}
    </Button>
  );
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 420px at 50% -80px, rgba(31, 77, 58, 0.08), transparent 70%)",
      }}
    >
      <AppBar position="sticky">
        <Toolbar
          sx={{
            gap: { xs: 1, md: 2 },
            minHeight: { xs: 56, sm: 72 },
            px: { xs: 1.5, md: 3 },
            py: { xs: 1, sm: 0 },
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          <Box
            component={Link}
            href={brandHref}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              color: "text.primary",
              textDecoration: "none",
              mr: { xs: 0, md: 1 },
              flexShrink: 0,
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 30,
                height: 30,
                borderRadius: 1.5,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "grid",
                placeItems: "center",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "-0.06em",
              }}
            >
              B
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                display: { xs: "none", sm: "block" },
              }}
            >
              {brandTitle}
            </Typography>
          </Box>
          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              gap: 0.25,
              flexGrow: 1,
              minWidth: 0,
            }}
          >
            {navItems.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                active={isNavItemActive(pathname, item.href)}
              />
            ))}
          </Box>
          {headerActions ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexShrink: 0,
                ml: "auto",
              }}
            >
              {headerActions}
            </Box>
          ) : null}
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              gap: 0.25,
              width: "100%",
              pb: 0.5,
            }}
          >
            {navItems.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                active={isNavItemActive(pathname, item.href)}
              />
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Container
        component="main"
        maxWidth="lg"
        sx={{ flex: 1, py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}
      >
        {children}
      </Container>
    </Box>
  );
}
