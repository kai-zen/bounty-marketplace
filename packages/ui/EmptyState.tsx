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
        py: 6,
        px: 2,
        textAlign: "center",
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h6" component="p" gutterBottom>
        {title}
      </Typography>
      {message ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 2 : 0 }}>
          {message}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: message ? 0 : 2 }}>{action}</Box> : null}
    </Box>
  );
}
