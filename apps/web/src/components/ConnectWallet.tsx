"use client";

import { defaultChainId } from "@/wagmi/config";
import { formatAddress } from "@/lib/formatAddress";
import { fontFamilies } from "@bounty/ui";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {
  useChainId,
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
} from "wagmi";

/** MetaMask / injected wallet connect control for the app shell header. */
export function ConnectWallet() {
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const { mutate: connect, isPending, error } = useConnect();
  const connectors = useConnectors();
  const { mutate: disconnect } = useDisconnect();

  const injectedConnector = connectors.find((c) => c.id === "injected") ?? connectors[0];
  const wrongChain = isConnected && chainId !== defaultChainId;

  if (isConnected && address) {
    return (
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, alignItems: "center" }}>
        {wrongChain ? (
          <Typography
            variant="caption"
            color="warning.main"
            sx={{ display: { xs: "none", md: "block" }, fontFamily: fontFamilies.sans }}
          >
            Wrong network
          </Typography>
        ) : null}
        <Button
          variant="outlined"
          size="small"
          onClick={() => disconnect()}
          sx={{ fontFamily: fontFamilies.mono, fontSize: "0.78rem" }}
        >
          {formatAddress(address)}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-end" }}>
      <Button
        variant="contained"
        size="small"
        disabled={!injectedConnector || isPending}
        onClick={() => {
          if (injectedConnector) {
            connect({ connector: injectedConnector, chainId: defaultChainId });
          }
        }}
      >
        {isPending ? "Connecting…" : (
          <>
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              Connect wallet
            </Box>
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
              Connect
            </Box>
          </>
        )}
      </Button>
      {error ? (
        <Typography variant="caption" color="error" sx={{ fontFamily: fontFamilies.sans }}>
          {error.message}
        </Typography>
      ) : null}
    </Box>
  );
}
