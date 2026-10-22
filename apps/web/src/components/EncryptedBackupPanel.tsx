"use client";

import { useState } from "react";
import { MIN_PASSPHRASE_LENGTH, checkPassphrase, decryptBackup, encryptBackup, type Dataset } from "@proofbridge/core";
import { Button, ErrorText, inputClass, labelClass } from "@/components/ui";
import { useData } from "@/lib/data";
import { downloadText } from "@/lib/files";
import { useAction } from "@/lib/useAction";

const fileStamp = () => new Date().toISOString().slice(0, 10);

/**
 * Passphrase-encrypted vault backup (AES-256-GCM, PBKDF2-SHA-256 600k). The passphrase is used
 * once in memory and never stored; a forgotten passphrase means the backup cannot be opened.
 */
export function EncryptedBackupPanel({ data }: { data: Dataset }) {
  const { restore } = useData();
  const exp = useAction();
  const imp = useAction();
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [restorePass, setRestorePass] = useState("");
  const [pending, setPending] = useState<Dataset | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const problem = pass ? checkPassphrase(pass) ?? (pass2 && pass !== pass2 ? "The passphrases do not match." : null) : null;

  return (
    <div className="space-y-4 text-sm">
      <p>
        Same backup, encrypted with a passphrase you choose (AES-256-GCM; key derived with PBKDF2-SHA-256, 600 000
        rounds). Use it when the file will sit on a USB stick, in cloud storage or in email. The passphrase is never
        stored — if you forget it, the backup cannot be recovered.
      </p>
      <form
        aria-label="Export encrypted backup"
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void exp.run(async () => {
            if (pass !== pass2) throw new Error("The passphrases do not match.");
            const text = await encryptBackup(data, pass);
            downloadText(`proofbridge-vault-${fileStamp()}.encrypted.json`, text);
            setPass("");
            setPass2("");
            setDone("Encrypted backup downloaded.");
          });
        }}
      >
        <div>
          <label htmlFor="enc-pass" className={labelClass}>
            Passphrase (at least {MIN_PASSPHRASE_LENGTH} characters)
          </label>
          <input id="enc-pass" type="password" autoComplete="new-password" className={inputClass} value={pass} onChange={(e) => setPass(e.target.value)} />
        </div>
        <div>
          <label htmlFor="enc-pass2" className={labelClass}>
            Repeat passphrase
          </label>
          <input id="enc-pass2" type="password" autoComplete="new-password" className={inputClass} value={pass2} onChange={(e) => setPass2(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          {problem && <p className="mb-1 text-amber-700 dark:text-amber-400">{problem}</p>}
          <button
            type="submit"
            disabled={exp.busy || !pass || !!problem || pass !== pass2}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exp.busy ? "Encrypting…" : "Export encrypted backup"}
          </button>
        </div>
        <ErrorText error={exp.error} />
      </form>

      <form
        aria-label="Restore encrypted backup"
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(null);
          void imp.run(async () => {
            if (!file) throw new Error("Choose an encrypted backup file.");
            setPending(await decryptBackup(await file.text(), restorePass));
            setRestorePass("");
          });
        }}
      >
        <div>
          <label htmlFor="enc-file" className={labelClass}>
            Encrypted backup file
          </label>
          <input id="enc-file" type="file" accept="application/json,.json" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <label htmlFor="enc-restore-pass" className={labelClass}>
            Its passphrase
          </label>
          <input
            id="enc-restore-pass"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            value={restorePass}
            onChange={(e) => setRestorePass(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={imp.busy || !file || !restorePass}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {imp.busy ? "Decrypting…" : "Decrypt and check"}
          </button>
        </div>
        <ErrorText error={imp.error} />
      </form>

      {pending && (
        <div role="alertdialog" aria-label="Confirm encrypted restore" className="rounded border border-amber-600 p-2">
          <p>
            Decrypted and verified: {pending.artifacts.length} artifact(s), {pending.claims.length} claim(s),{" "}
            {pending.opportunities.length} opportunity(ies). Restoring <strong>replaces</strong> everything in this browser.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="danger"
              disabled={imp.busy}
              onClick={() =>
                void imp.run(async () => {
                  await restore(pending);
                  setPending(null);
                  setDone("Vault restored from encrypted backup.");
                })
              }
            >
              Replace vault with backup
            </Button>
            <Button onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {done && <p role="status">{done}</p>}
    </div>
  );
}
