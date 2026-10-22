"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { MAX_CAPTURE_FILE_BYTES, parseCaptureFile, type Capture, type Dataset } from "@proofbridge/core";
import { CaptureCard } from "@/components/CaptureCard";
import { Button, Card, ErrorText, PageHeader } from "@/components/ui";
import { WithData } from "@/components/WithData";
import { ExtensionUnavailableError, ackExtensionCaptures, listExtensionCaptures } from "@/lib/extension";
import { useAction } from "@/lib/useAction";

type Queued = { capture: Capture; from: "extension" | "file" };
type ExtensionState = { status: "checking" } | { status: "connected" } | { status: "unavailable" | "error"; message: string };

const isImported = (data: Dataset, id: string) =>
  data.sources.some((s) => s.label.includes(id)) || data.opportunities.some((o) => o.sourceLabel.includes(id));

export default function InboxPage() {
  const [ext, setExt] = useState<ExtensionState>({ status: "checking" });
  const [queue, setQueue] = useState<Queued[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const file = useAction();

  const refresh = useCallback(async () => {
    setExt({ status: "checking" });
    try {
      const captures = await listExtensionCaptures();
      setQueue((q) => [...captures.map((capture) => ({ capture, from: "extension" as const })), ...q.filter((x) => x.from === "file")]);
      setExt({ status: "connected" });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setExt({ status: e instanceof ExtensionUnavailableError ? "unavailable" : "error", message });
    }
  }, []);

  useEffect(() => {
    // Reading the extension's queue is the only thing that happens on load; nothing is imported.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function done(capture: Capture, outcome: "imported" | "discarded") {
    const item = queue.find((q) => q.capture.id === capture.id);
    setQueue((q) => q.filter((x) => x.capture.id !== capture.id));
    setNotice(outcome === "imported" ? `Imported “${capture.title}”.` : `Discarded “${capture.title}”.`);
    if (item?.from === "extension") {
      try {
        await ackExtensionCaptures([capture.id]);
      } catch (e) {
        setNotice(`${outcome === "imported" ? "Imported" : "Discarded"} here, but the extension still lists it (${e instanceof Error ? e.message : String(e)}). Delete it in the extension popup.`);
      }
    }
  }

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    await file.run(async () => {
      if (f.size > MAX_CAPTURE_FILE_BYTES) throw new Error("That capture file is larger than 1 MB.");
      const parsed = parseCaptureFile(await f.text());
      setQueue((q) => [
        ...q,
        ...parsed.captures.filter((c) => !q.some((x) => x.capture.id === c.id)).map((capture) => ({ capture, from: "file" as const })),
      ]);
    });
  }

  return (
    <>
      <PageHeader
        title="Capture Inbox"
        lede="Pages you captured with the ProofBridge Capture browser extension wait here. Review each one and choose how to save it; nothing enters your vault until you do."
      />
      <div className="space-y-4">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm">
              {ext.status === "checking" && "Checking for the extension…"}
              {ext.status === "connected" && "Connected to the ProofBridge Capture extension (local, this browser only)."}
              {(ext.status === "unavailable" || ext.status === "error") && ext.message}
            </p>
            <Button onClick={() => void refresh()} disabled={ext.status === "checking"}>
              Check extension again
            </Button>
          </div>
          {ext.status === "unavailable" && (
            <p className="mt-2 text-xs text-[var(--fg-muted)]">
              Install it from <span className="font-mono">apps/extension</span> (see QUICKSTART.md), set its app address to{" "}
              <span className="font-mono">{typeof window === "undefined" ? "" : window.location.origin}</span>, or use the file fallback
              below.
            </p>
          )}
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            <label htmlFor="capture-file" className="block text-sm font-medium">
              Import a capture file <span className="font-normal text-[var(--fg-muted)]">(“Download as file” in the extension; max 1 MB)</span>
            </label>
            <input id="capture-file" type="file" accept="application/json,.json" className="mt-1 text-sm" onChange={(e) => void importFile(e)} />
            <ErrorText error={file.error} />
          </div>
        </Card>

        {notice && (
          <p role="status" className="text-sm">
            {notice} <Link href="/evidence" className="text-[var(--accent)] underline">Evidence Vault</Link> ·{" "}
            <Link href="/opportunities" className="text-[var(--accent)] underline">Opportunity Lab</Link>
          </p>
        )}

        <WithData>
          {(data) =>
            queue.length === 0 ? (
              <p className="text-[var(--fg-muted)]">No captures waiting.</p>
            ) : (
              <div className="space-y-4" aria-label="Captures waiting for review">
                {queue.map(({ capture }) => (
                  <CaptureCard
                    key={capture.id}
                    capture={capture}
                    skills={data.skills}
                    alreadyImported={isImported(data, capture.id)}
                    onDone={done}
                  />
                ))}
              </div>
            )
          }
        </WithData>
      </div>
    </>
  );
}
