import { getDemo } from "../lib/demo";

/**
 * Share Studio (directive §2.F). Default everything private. Phase 0 previews exactly which
 * fields a dossier would contain; real PDF/JSON export and expiring public links are Phase 1/4.
 */
export default function SharePage() {
  const { dataset, opportunity, results } = getDemo();
  const supported = results.filter((r) => r.status === "supported");
  const claimById = new Map(dataset.claims.map((c) => [c.id, c]));

  return (
    <>
      <h1 className="page-title">Share Studio</h1>
      <p className="page-sub">
        Preview the exact dossier contents before anything leaves your device. Default: private.
      </p>

      <div className="card">
        <span className="tag demo">Preview — nothing is shared</span>
        <h3 style={{ marginTop: 10 }}>Dossier for {opportunity.title}</h3>
        <p className="muted">
          About: {dataset.profile.displayName} — {dataset.profile.headline}
        </p>

        <h4>Included: supported requirements ({supported.length})</h4>
        {supported.length === 0 ? (
          <p className="muted">No supported requirements yet to include.</p>
        ) : (
          <ul className="clean">
            {supported.map((r) => (
              <li key={r.requirementId}>
                <strong>{r.label}</strong>
                {r.supportingClaimIds.map((id) => (
                  <div key={id} className="mono">← {claimById.get(id)?.statement}</div>
                ))}
              </li>
            ))}
          </ul>
        )}

        <p className="muted" style={{ marginTop: 14 }}>
          Raw source documents and anything marked private are excluded by default. Export to PDF/JSON
          and optional expiring public links arrive in later phases; already-downloaded files can never
          be revoked.
        </p>
      </div>
    </>
  );
}
