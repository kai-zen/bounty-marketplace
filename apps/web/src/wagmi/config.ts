import { createConfig, http } from "wagmi";
import { hardhat, sepolia, type Chain } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const localRpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL?.trim() || "http://127.0.0.1:8545";

const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL?.trim();

function buildChains(): [Chain, ...Chain[]] {
  const chains: Chain[] = [hardhat];
  if (sepoliaRpcUrl) {
    chains.push(sepolia);
  }
  return chains as [Chain, ...Chain[]];
}

export const supportedChains = buildChains();

export const defaultChainId = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID?.trim() || String(hardhat.id),
);

const transports = supportedChains.reduce<Record<number, ReturnType<typeof http>>>(
  (acc, chain) => {
    if (chain.id === hardhat.id) {
      acc[chain.id] = http(localRpcUrl);
    } else if (chain.id === sepolia.id && sepoliaRpcUrl) {
      acc[chain.id] = http(sepoliaRpcUrl);
    }
    return acc;
  },
  {},
);

/** Shared wagmi config: local Hardhat (31337) plus optional Sepolia when RPC env is set. */
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [injected()],
  transports,
  ssr: true,
});
