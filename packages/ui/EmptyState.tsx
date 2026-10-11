import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  message?: string;
  action?: ReactNode;
};

/** Centered placeholder when a list or panel has no items. */
export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        py: { xs: 6, md: 8 },
        px: 3,
        textAlign: "center",
        borderRadius: 2,
        border: "1px dashed",
        borderColor: "divider",
        bgcolor: "rgba(255, 253, 248, 0.7)",
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 44,
          height: 44,
          mx: "auto",
          mb: 2,
          borderRadius: 2,
          bgcolor: "action.hover",
          color: "text.secondary",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        —
      </Box>
      <Typography variant="h6" component="p" sx={{ mb: message ? 0.75 : 0 }}>
        {title}
      </Typography>
      {message ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: action ? 2.5 : 0, maxWidth: 420, mx: "auto" }}
        >
          {message}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: message ? 0 : 2 }}>{action}</Box> : null}
    </Box>
  );
}
