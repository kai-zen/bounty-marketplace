/** Shorten a hex address for display (e.g. `0x1234…5678`). */
export function formatAddress(address: string, visible = 4): string {
  if (address.length < visible * 2 + 2) {
    return address;
  }
  return `${address.slice(0, visible + 2)}…${address.slice(-visible)}`;
}
