import { getDemo } from "../lib/demo";
import { StatusTag } from "../components/Bits";

/**
 * Proof Graph (directive §2.B). Phase 0 renders the provenance chain as an accessible,
 * keyboard-navigable list/table (the mandatory graph *alternative* from §2.B and §10.14).
 * The interactive 2D React Flow canvas lands in Phase 1 on top of this same projection.
 */
const KIND_ORDER = ["artifact", "claim", "skill", "requirement", "opportunity", "task"] as const;
const KIND_LABEL: Record<string, string> = {
  artifact: "Evidence",
  claim: "Claim",
  skill: "Skill",
  requirement: "Requirement",
  opportunity: "Opportunity",
  task: "Next step",
};

export default function GraphPage() {
  const { graph } = getDemo();
  const outgoing = (id: string) => graph.edges.filter((e) => e.from === id);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <>
      <h1 className="page-title">Proof Graph</h1>
      <p className="page-sub">
        Evidence → Claim → Skill → Requirement → Opportunity → Next step. Every edge comes from a
        typed persisted relation — no fictional links.
      </p>

      <div className="card chain" aria-hidden="true">
        {KIND_ORDER.map((k, i) => (
          <span key={k} style={{ display: "contents" }}>
            <span className="node">{KIND_LABEL[k]}</span>
            {i < KIND_ORDER.length - 1 && <span className="arrow">→</span>}
          </span>
        ))}
      </div>

      {KIND_ORDER.map((kind) => {
        const nodes = graph.nodes.filter((n) => n.kind === kind);
        if (nodes.length === 0) return null;
        return (
          <div className="card" key={kind}>
            <h3>{KIND_LABEL[kind]}</h3>
            <ul className="clean">
              {nodes.map((n) => {
                const edges = outgoing(n.id);
                return (
                  <li key={n.id}>
                    <strong>{n.label}</strong>{" "}
                    {n.kind === "requirement" && n.status && <StatusTag status={n.status} />}
                    {edges.length > 0 && (
                      <div className="mono" style={{ marginTop: 4 }}>
                        {edges.map((e, idx) => (
                          <span key={idx}>
                            {e.relation} → {nodeById.get(e.to)?.label}
                            {idx < edges.length - 1 ? "; " : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}
