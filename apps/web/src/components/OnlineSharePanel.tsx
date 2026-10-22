"use client";

import { useCallback, useState } from "react";
import { buildDossier, type Dataset } from "@proofbridge/core";
import { Button, ErrorText, inputClass, labelClass } from "@/components/ui";
import { formatDateTime } from "@/lib/files";
import {
  EXPIRY_OPTIONS,
  createShare,
  listShares,
  loadShareSettings,
  newShareSettings,
  normaliseServerUrl,
  revokeShare,
  saveShareSettings,
  type RemoteShare,
  type ShareSettings,
} from "@/lib/share";
import { useAction } from "@/lib/useAction";

const STATE_LABEL: Record<RemoteShare["state"], string> = { active: "Active", expired: "Expired", revoked: "Revoked" };

function SetupForm({ onEnabled }: { onEnabled: (s: ShareSettings) => void }) {
  const [open, setOpen] = useState(false);
  const [server, setServer] = useState("http://localhost:8787");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <div className="space-y-2 text-sm">
        <p>
          Online share links are <strong>off</strong>. Nothing leaves this browser.
        </p>
        <Button onClick={() => setOpen(true)}>Set up an online share link…</Button>
      </div>
    );
  }
  return (
    <form
      className="space-y-3 text-sm"
      aria-label="Set up online share links"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          normaliseServerUrl(server);
          const s = newShareSettings(server);
          saveShareSettings(s);
          onEnabled(s);
        } catch (err) {
          setError((err as Error).message);
        }
      }}
    >
      <p>
        An online link lets someone without ProofBridge read one dossier in a browser. It needs a share service you run
        or trust (<code>pnpm --filter @proofbridge/share-server start</code> runs one on this machine).
      </p>
      <ul className="list-disc space-y-1 ps-5">
        <li>The dossier is encrypted in this browser. The service stores only ciphertext and never receives the key.</li>
        <li>The key is part of the link. Anyone who has the full link can read the dossier until it expires or you revoke it.</li>
        <li>Only the dossier preview is shared — private and redacted evidence is never included. Your vault is never uploaded.</li>
        <li>Revoking stops the link working. Copies already saved, printed or screenshotted cannot be revoked.</li>
      </ul>
      <div>
        <label htmlFor="share-server" className={labelClass}>
          Share service address
        </label>
        <input id="share-server" className={inputClass} value={server} onChange={(e) => setServer(e.target.value)} inputMode="url" />
      </div>
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span>I understand what is uploaded and that a shared link can be read by anyone who has it.</span>
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!consent}
          className="rounded-md border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-sm text-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enable online share links
        </button>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <ErrorText error={error} />
    </form>
  );
}

export function OnlineSharePanel({ data }: { data: Dataset }) {
  // Rendered only after the vault loads (client-side), so localStorage is available.
  const [settings, setSettings] = useState<ShareSettings | null>(() => loadShareSettings());
  const [remote, setRemote] = useState<Map<string, RemoteShare> | null>(null);
  const [oppId, setOppId] = useState(data.opportunities[0]?.id ?? "");
  const [ttl, setTtl] = useState<number>(EXPIRY_OPTIONS[1].seconds);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { run, busy, error } = useAction();

  const refresh = useCallback(
    (s: ShareSettings) =>
      run(async () => {
        setRemote(new Map((await listShares(s)).map((r) => [r.id, r])));
        setNow(Date.now());
      }),
    [run],
  );

  if (!settings) return <SetupForm onEnabled={(s) => setSettings(s)} />;

  const opp = data.opportunities.find((o) => o.id === oppId) ?? data.opportunities[0];
  const update = (next: ShareSettings) => {
    saveShareSettings(next);
    setSettings(next);
  };
  const stateOf = (id: string, expiresAt: string) =>
    remote?.get(id)?.state ?? (Date.parse(expiresAt) <= now ? "expired" : null);
  const anyActive = settings.shares.some((s) => stateOf(s.id, s.expiresAt) !== "expired" && stateOf(s.id, s.expiresAt) !== "revoked");

  return (
    <div className="space-y-4 text-sm">
      <p>
        Online share links are <strong>on</strong>, using <code>{settings.serverUrl}</code>. Requests are made only when you
        create, refresh or revoke a link.
      </p>

      {opp ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label htmlFor="share-opp" className={labelClass}>
              Dossier to share
            </label>
            <select id="share-opp" className={inputClass} value={opp.id} onChange={(e) => setOppId(e.target.value)}>
              {data.opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="share-ttl" className={labelClass}>
              Link expires after
            </label>
            <select id="share-ttl" className={inputClass} value={ttl} onChange={(e) => setTtl(Number(e.target.value))}>
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.seconds} value={o.seconds}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const share = await createShare(settings, buildDossier(data, opp.id, new Date().toISOString()), ttl);
                update({ ...settings, shares: [...settings.shares, share] });
                setCreated(share.link);
                setCopied(false);
                setRemote(new Map((await listShares(settings)).map((r) => [r.id, r])));
                setNow(Date.now());
              })
            }
          >
            Create encrypted link
          </Button>
        </div>
      ) : (
        <p className="text-[var(--fg-muted)]">Import an opportunity to share a dossier.</p>
      )}

      {created && (
        <div role="status" className="space-y-1 rounded border border-[var(--accent)] p-2">
          <label htmlFor="share-link" className={labelClass}>
            New link (includes the key — send it only to the intended reader)
          </label>
          <div className="flex gap-2">
            <input id="share-link" readOnly className={inputClass} value={created} onFocus={(e) => e.currentTarget.select()} />
            <Button
              onClick={() =>
                void navigator.clipboard?.writeText(created).then(
                  () => setCopied(true),
                  () => setCopied(false),
                )
              }
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      <section aria-labelledby="share-list-h" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 id="share-list-h" className="font-medium">
            Your share links
          </h3>
          <Button disabled={busy} onClick={() => void refresh(settings)}>
            Refresh status
          </Button>
        </div>
        {settings.shares.length === 0 ? (
          <p className="text-[var(--fg-muted)]">No links yet.</p>
        ) : (
          <ul className="space-y-2" aria-label="Share links">
            {[...settings.shares].reverse().map((s) => {
              const r = remote?.get(s.id);
              const state = stateOf(s.id, s.expiresAt);
              return (
                <li key={s.id} className="rounded border border-[var(--border)] p-2" aria-label={`Share: ${s.title}`}>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-[var(--fg-muted)]">
                    <span data-testid="share-state">{state ? STATE_LABEL[state] : "Status not checked"}</span> · expires{" "}
                    {formatDateTime(s.expiresAt)}
                    {r && ` · opened ${r.accessCount} time(s)`}
                    {r?.revokedAt && ` · revoked ${formatDateTime(r.revokedAt)}`}
                  </p>
                  {state !== "revoked" && state !== "expired" && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {confirmRevoke === s.id ? (
                        <>
                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await revokeShare(settings, s.id);
                                setConfirmRevoke(null);
                                if (created === s.link) setCreated(null);
                                await refresh(settings);
                              })
                            }
                          >
                            Confirm revoke
                          </Button>
                          <Button onClick={() => setConfirmRevoke(null)}>Keep link</Button>
                        </>
                      ) : (
                        <Button variant="danger" onClick={() => setConfirmRevoke(s.id)} aria-label={`Revoke link: ${s.title}`}>
                          Revoke
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ErrorText error={error} />

      <div className="border-t border-[var(--border)] pt-3">
        <Button
          disabled={anyActive}
          onClick={() => {
            saveShareSettings(null);
            setSettings(null);
            setRemote(null);
            setCreated(null);
          }}
        >
          Turn off online sharing on this device
        </Button>
        {anyActive && (
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Revoke active links first (or check their status): turning off forgets the key that lets you revoke them.
          </p>
        )}
      </div>
    </div>
  );
}
