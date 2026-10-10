import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Hardhat account #1. Account #0 sends the deploy and becomes the factory owner.
 * Override with the `FEE_RECIPIENT` env var or the `feeRecipient` Ignition parameter.
 */
const DEV_FEE_RECIPIENT_ACCOUNT = 1;

/** 2.5%. Matches the Foundry unit tests. Override with the `platformFeeBps` parameter. */
const DEFAULT_PLATFORM_FEE_BPS = 250n;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Local fee recipient: `FEE_RECIPIENT` when set, otherwise a Hardhat dev account.
 * An Ignition parameters file can still override this default.
 */
function feeRecipientDefault(): string | undefined {
  const fromEnv = process.env.FEE_RECIPIENT;
  if (fromEnv === undefined || fromEnv === "") {
    return undefined;
  }

  if (!ADDRESS_RE.test(fromEnv)) {
    throw new Error(
      "FEE_RECIPIENT must be a 20-byte hex address (0x followed by 40 hex digits)",
    );
  }

  return fromEnv;
}

/** Deploys SubmissionRegistry, then BountyFactory wired to that registry. */
export default buildModule("MarketplaceModule", (m) => {
  const registry = m.contract("SubmissionRegistry");

  const fromEnv = feeRecipientDefault();
  const feeRecipient = m.getParameter(
    "feeRecipient",
    fromEnv ?? m.getAccount(DEV_FEE_RECIPIENT_ACCOUNT),
  );
  const platformFeeBps = m.getParameter(
    "platformFeeBps",
    DEFAULT_PLATFORM_FEE_BPS,
  );

  const factory = m.contract("BountyFactory", [
    registry,
    feeRecipient,
    platformFeeBps,
  ]);

  return { registry, factory };
});
