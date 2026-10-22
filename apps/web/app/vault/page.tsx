import { getDemo } from "../lib/demo";

const VERIFY_NOTE: Record<string, string> = {
  "source-present": "Supported by bytes/text in the source.",
  "issuer-verified": "Genuine issuer attestation.",
  "user-stated": "Self-reported; no supporting source.",
  unverified: "Imported, not yet characterised.",
};

/** Evidence Vault (directive §2.C): artifacts, claims, provenance, integrity. */
export default function VaultPage() {
  const { dataset } = getDemo();
  const sourceById = new Map(dataset.sources.map((s) => [s.id, s]));

  return (
    <>
      <h1 className="page-title">Evidence Vault</h1>
      <p className="page-sub">
        Source-linked claims with explicit verification state. A hash proves byte integrity — never truth.
      </p>

      {dataset.artifacts.map((a) => {
        const src = sourceById.get(a.sourceId);
        const claims = dataset.claims.filter((c) => c.artifactId === a.id);
        return (
          <div className="card" key={a.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>{a.title}</h3>
                <span className="mono">{a.artifactType}</span>
              </div>
              <div className="mono" style={{ textAlign: "right" }}>
                {src?.label}
                <br />
                {src?.integritySha256
                  ? `sha256:${src.integritySha256.slice(0, 16)}…`
                  : "no byte hash (manual)"}
              </div>
            </div>
            {claims.length > 0 && (
              <ul className="clean" style={{ marginTop: 12 }}>
                {claims.map((c) => (
                  <li key={c.id}>
                    {c.statement}
                    <br />
                    <span className="mono">
                      {c.verification} · {VERIFY_NOTE[c.verification]} · review: {c.review}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}
