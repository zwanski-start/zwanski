import { evaluateOpportunity, buildGraph } from "@proofbridge/core";
import { demoDataset } from "@proofbridge/fixtures";

/**
 * Single source of truth for the UI: the synthetic dataset plus the deterministic
 * derivations. Everything the screens render comes from here — no hardcoded numbers
 * in components, so the UI can never disagree with the engine (directive §2, §3).
 */
export function getDemo() {
  const dataset = demoDataset();
  const opportunity = dataset.opportunities[0]!;
  const { results, coverage } = evaluateOpportunity(dataset, opportunity.id);
  const graph = buildGraph(dataset);
  return { dataset, opportunity, results, coverage, graph };
}

export const STATUS_LABEL: Record<string, string> = {
  supported: "Supported",
  uncertain: "Uncertain",
  "not-yet-supported": "Not yet supported",
  unknown: "Unknown",
  "not-applicable": "Not applicable",
};
