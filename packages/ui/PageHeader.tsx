import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Trailing actions (buttons, chips) aligned to the title row on wide screens. */
  actions?: ReactNode;
};

/** Page title block with optional subtitle and action slot. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "flex-start" },
        justifyContent: "space-between",
        gap: 2.5,
        mb: { xs: 3.5, md: 4.5 },
      }}
    >
      <Box sx={{ maxWidth: 640 }}>
        <Typography component="h1" variant="h4" sx={{ mb: subtitle ? 1 : 0 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 52 * 8 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 1,
            pt: { sm: 0.5 },
          }}
        >
          {actions}
        </Box>
      ) : null}
    </Box>
  );
}
