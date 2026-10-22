import type { Coverage } from "@proofbridge/core";
import { STATUS_LABEL } from "../lib/demo";

export function StatusTag({ status }: { status: string }) {
  return <span className={`tag ${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

/** Before/after-ready coverage meter driven entirely by the engine's counts (§2.E). */
export function CoverageMeter({ coverage }: { coverage: Coverage }) {
  const total = Math.max(coverage.total, 1);
  const seg = (n: number) => ({ width: `${(n / total) * 100}%` });
  return (
    <div>
      <div className="meter" role="img" aria-label={`${coverage.supported} supported, ${coverage.uncertain} uncertain, ${coverage.notYetSupported} not yet supported, ${coverage.unknown} unknown of ${coverage.total}`}>
        <span className="s-supported" style={seg(coverage.supported)} />
        <span className="s-uncertain" style={seg(coverage.uncertain)} />
        <span className="s-not-yet" style={seg(coverage.notYetSupported)} />
        <span className="s-unknown" style={seg(coverage.unknown)} />
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--supported)" }} />Supported {coverage.supported}</span>
        <span><i style={{ background: "var(--uncertain)" }} />Uncertain {coverage.uncertain}</span>
        <span><i style={{ background: "var(--not-yet)" }} />Not yet {coverage.notYetSupported}</span>
        <span><i style={{ background: "var(--unknown)" }} />Unknown {coverage.unknown}</span>
      </div>
    </div>
  );
}
