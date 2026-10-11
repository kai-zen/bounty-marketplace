"use client";

import { defaultChainId } from "@/wagmi/config";
import { formatAddress } from "@/lib/formatAddress";
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
          <Typography variant="caption" color="warning.main">
            Switch to chain {defaultChainId}
          </Typography>
        ) : null}
        <Button variant="outlined" size="small" onClick={() => disconnect()}>
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
        {isPending ? "Connecting…" : "Connect wallet"}
      </Button>
      {error ? (
        <Typography variant="caption" color="error">
          {error.message}
        </Typography>
      ) : null}
    </Box>
  );
}
