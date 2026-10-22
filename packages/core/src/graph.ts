import type { Dataset } from "./schema";
import { evaluateOpportunity } from "./match";

/**
 * Projects the relational provenance model into a graph for the Proof Graph UI
 * (directive §2.B). Every edge derives from a typed persisted relation; the projection
 * never invents links. The graph is a *view*, not the database.
 *
 * Chain: Evidence(artifact) -> Claim -> Skill -> Requirement -> Opportunity -> Next Step(task)
 */

export type GraphNodeKind =
  | "artifact"
  | "claim"
  | "skill"
  | "requirement"
  | "opportunity"
  | "task";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** Optional status for requirement nodes, for coloring. */
  status?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

export interface GraphProjection {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const nid = (kind: GraphNodeKind, id: string) => `${kind}:${id}`;

export function buildGraph(dataset: Dataset): GraphProjection {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const addNode = (n: GraphNode) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    nodes.push(n);
  };

  for (const a of dataset.artifacts) addNode({ id: nid("artifact", a.id), kind: "artifact", label: a.title });
  for (const c of dataset.claims) {
    addNode({ id: nid("claim", c.id), kind: "claim", label: c.statement });
    edges.push({ from: nid("artifact", c.artifactId), to: nid("claim", c.id), relation: "evidences" });
  }
  for (const s of dataset.skills) addNode({ id: nid("skill", s.id), kind: "skill", label: s.label });
  for (const l of dataset.claimSkillLinks) {
    edges.push({ from: nid("claim", l.claimId), to: nid("skill", l.skillId), relation: "demonstrates" });
  }
  for (const o of dataset.opportunities) addNode({ id: nid("opportunity", o.id), kind: "opportunity", label: o.title });

  for (const o of dataset.opportunities) {
    const { results } = evaluateOpportunity(dataset, o.id);
    const statusById = new Map(results.map((r) => [r.requirementId, r.status]));
    for (const r of dataset.requirements.filter((x) => x.opportunityId === o.id)) {
      addNode({ id: nid("requirement", r.id), kind: "requirement", label: r.label, status: statusById.get(r.id) });
      edges.push({ from: nid("requirement", r.id), to: nid("opportunity", o.id), relation: "required-by" });
    }
  }

  // Requirement <- supporting claim (from the deterministic evaluation, so the graph and the
  // Opportunity Lab always agree).
  for (const o of dataset.opportunities) {
    const { results } = evaluateOpportunity(dataset, o.id);
    for (const res of results) {
      for (const claimId of res.supportingClaimIds) {
        edges.push({ from: nid("claim", claimId), to: nid("requirement", res.requirementId), relation: "supports" });
      }
    }
  }

  for (const t of dataset.bridgeTasks) {
    addNode({ id: nid("task", t.id), kind: "task", label: t.title });
    edges.push({ from: nid("task", t.id), to: nid("requirement", t.requirementId), relation: "bridges" });
  }

  return { nodes, edges };
}
