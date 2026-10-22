import Link from "next/link";
import { getDemo } from "./lib/demo";
import { CoverageMeter } from "./components/Bits";

/** Home / Compass (directive §2.A): one meaningful next action + honest state. */
export default function CompassPage() {
  const { dataset, opportunity, coverage, results } = getDemo();
  const nextGap = results.find((r) => r.status === "not-yet-supported" || r.status === "uncertain" || r.status === "unknown");
  const lastCapture = [...dataset.artifacts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  return (
    <>
      <h1 className="page-title">Compass</h1>
      <p className="page-sub">
        Turn real work into portable proof, and portable proof into realistic next steps.
      </p>

      <div className="card" style={{ borderColor: "var(--accent)" }}>
        <span className="tag demo">DEMO / SYNTHETIC</span>
        <h2 style={{ marginTop: 10 }}>Today&rsquo;s one next action</h2>
        {nextGap ? (
          <p>
            For <strong>{opportunity.title}</strong>, your closest gap is{" "}
            <strong>{nextGap.label}</strong> — {nextGap.reason}{" "}
            <Link href="/plan">Open the Bridge Plan →</Link>
          </p>
        ) : (
          <p>Every requirement is supported. Review and export your dossier.</p>
        )}
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Requirement coverage</h3>
          <CoverageMeter coverage={coverage} />
          <p className="muted" style={{ marginTop: 12 }}>
            {coverage.supported} of {coverage.total} requirements supported by source-present evidence.
            No probabilities, no scores — just counts you can trace.
          </p>
        </div>
        <div className="card">
          <h3>Recent capture</h3>
          {lastCapture ? (
            <p>
              <strong>{lastCapture.title}</strong>
              <br />
              <span className="mono">{lastCapture.artifactType}</span>
            </p>
          ) : (
            <p className="muted">No evidence yet. Import a project to begin.</p>
          )}
          <p style={{ marginTop: 12 }}>
            <Link href="/vault">Go to Evidence Vault →</Link>
          </p>
        </div>
      </div>

      <div className="card">
        <h3>How this demo works</h3>
        <p className="muted">
          All data here is explicitly synthetic and runs fully in your browser with no account,
          no API key and no AI model. Import your own evidence, compare it against a real pasted
          opportunity, and export a selective dossier — offline.
        </p>
      </div>
    </>
  );
}
