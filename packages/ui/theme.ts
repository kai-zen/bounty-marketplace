import { createTheme } from "@mui/material/styles";

/**
 * Baseline Material theme for marketplace screens.
 * Typography stays on MUI's Roboto stack so default letter-spacing is preserved.
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1565c0",
    },
    secondary: {
      main: "#00695c",
    },
    background: {
      default: "#f4f6f8",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 8,
  },
});
