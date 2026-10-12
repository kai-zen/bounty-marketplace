import { readFile } from "node:fs/promises";

/** Lets Node 24 load the package's JSON ABI imports without import attributes. */
export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) {
    return {
      format: "json",
      source: await readFile(new URL(url)),
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
