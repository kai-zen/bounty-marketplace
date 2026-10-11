import { createTheme } from "@mui/material/styles";

const ink = "#161513";
const stone = "#F3EFE6";
const paper = "#FFFDF8";
const forest = "#1F4D3A";
const gold = "#B7791F";
const muted = "#6B655A";
const line = "#E2DBCC";

const sans = 'var(--font-geist-sans), "Segoe UI", system-ui, sans-serif';
const mono = "var(--font-geist-mono), ui-monospace, monospace";

/**
 * Marketplace theme: warm paper, ink type, forest actions, gold rewards.
 * Body fonts come from Next.js Geist variables on <html>.
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: forest,
      dark: "#163828",
      light: "#2D6A52",
      contrastText: "#F7F3EA",
    },
    secondary: {
      main: gold,
      dark: "#8C5C14",
      light: "#D7A04A",
      contrastText: "#1A160C",
    },
    background: {
      default: stone,
      paper,
    },
    text: {
      primary: ink,
      secondary: muted,
    },
    divider: line,
    success: { main: "#2F7A4F" },
    warning: { main: gold },
    error: { main: "#B42318" },
    info: { main: "#2C5F8A" },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: sans,
    h1: { fontWeight: 700, letterSpacing: "-0.04em" },
    h2: { fontWeight: 700, letterSpacing: "-0.03em" },
    h3: { fontWeight: 650, letterSpacing: "-0.03em" },
    h4: {
      fontWeight: 650,
      letterSpacing: "-0.03em",
      fontSize: "2rem",
      lineHeight: 1.2,
    },
    h5: { fontWeight: 600, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.3 },
    subtitle1: { letterSpacing: "-0.01em" },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.55 },
    button: {
      fontWeight: 600,
      textTransform: "none",
      letterSpacing: "-0.01em",
    },
    overline: {
      fontWeight: 650,
      letterSpacing: "0.08em",
    },
    caption: {
      fontFamily: mono,
      letterSpacing: "-0.01em",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: stone,
          color: ink,
          fontFamily: sans,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        color: "inherit",
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: "rgba(255, 253, 248, 0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(22, 21, 19, 0.08)",
          color: ink,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 16,
        },
        sizeSmall: {
          paddingInline: 12,
        },
        sizeLarge: {
          paddingInline: 20,
          minHeight: 44,
        },
        contained: {
          boxShadow: "none",
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: `1px solid ${line}`,
          backgroundImage: "none",
          backgroundColor: paper,
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        outlined: {
          borderColor: line,
          backgroundColor: paper,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 650,
          borderRadius: 999,
        },
        sizeSmall: {
          height: 24,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: paper,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 72,
        },
      },
    },
  },
});

export const fontFamilies = { sans, mono };
