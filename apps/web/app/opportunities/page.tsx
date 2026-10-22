import { getDemo } from "../lib/demo";
import { StatusTag, CoverageMeter } from "../components/Bits";

/** Opportunity Lab (directive §2.D): transparent requirement-to-evidence comparison. */
export default function OpportunityPage() {
  const { dataset, opportunity, results, coverage } = getDemo();
  const claimById = new Map(dataset.claims.map((c) => [c.id, c]));

  return (
    <>
      <h1 className="page-title">Opportunity Lab</h1>
      <p className="page-sub">
        {opportunity.title}
        {opportunity.organisation ? ` · ${opportunity.organisation}` : ""}
      </p>

      <div className="card">
        <span className="tag demo">DEMO / SYNTHETIC — not a live listing</span>
        <p style={{ marginTop: 10 }} className="muted">{opportunity.rawText}</p>
        <CoverageMeter coverage={coverage} />
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Requirement</th>
              <th>State</th>
              <th>Why (traceable)</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.requirementId}>
                <td>{r.label}</td>
                <td><StatusTag status={r.status} /></td>
                <td>
                  {r.reason}
                  {r.supportingClaimIds.length > 0 && (
                    <ul className="clean" style={{ marginTop: 6 }}>
                      {r.supportingClaimIds.map((id) => (
                        <li key={id} className="mono" style={{ border: "none", padding: "2px 0" }}>
                          ← {claimById.get(id)?.statement}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 14 }}>
          States are computed deterministically from typed relations — no LLM, no hidden score.
          AI suggestions never flip a requirement to Supported without explicit human review.
        </p>
      </div>
    </>
  );
}
