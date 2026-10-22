import { getDemo } from "../lib/demo";
import { StatusTag } from "../components/Bits";

/** Bridge Plan (directive §2.E): missing requirements -> small proposed tasks. */
export default function PlanPage() {
  const { dataset, results } = getDemo();
  const resultByReq = new Map(results.map((r) => [r.requirementId, r]));
  const totalHours = dataset.bridgeTasks.reduce((n, t) => n + t.estimateHours, 0);

  return (
    <>
      <h1 className="page-title">Bridge Plan</h1>
      <p className="page-sub">
        Each task is tied to an exact evidence gap. Completing a task attaches new proof — it never
        auto-certifies a skill. Estimated effort: {totalHours}h (editable in Phase 1).
      </p>

      {dataset.bridgeTasks.map((t) => {
        const res = resultByReq.get(t.requirementId);
        return (
          <div className="card" key={t.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>{t.title}</h3>
                <span className="muted">Closes gap on: {res?.label}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                {res && <StatusTag status={res.status} />}
                <div className="mono" style={{ marginTop: 6 }}>~{t.estimateHours}h</div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
