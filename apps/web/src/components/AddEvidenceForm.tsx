"use client";

import { useState, type FormEvent } from "react";
import {
  EvidenceArtifactSchema,
  MAX_CONTENT_CHARS,
  RedactionSchema,
  VisibilitySchema,
  addEvidence,
  type EvidenceArtifact,
  type Redaction,
  type Skill,
} from "@proofbridge/core";
import { Button, ErrorText, inputClass, labelClass } from "@/components/ui";
import { useData } from "@/lib/data";
import { isTextLike, sha256Hex, utf8 } from "@/lib/files";
import { useAction } from "@/lib/useAction";

const KINDS = EvidenceArtifactSchema.shape.kind.options;
const KIND_LABEL: Record<EvidenceArtifact["kind"], string> = {
  repository: "Repository",
  "write-up": "Write-up / case study",
  certificate: "Certificate",
  document: "Document",
  image: "Image",
  note: "Note",
};
/** Local files larger than this are refused (hashed in memory, never uploaded). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Creates evidence from typed text or a local file. Everything happens in this browser: the
 * file is read and hashed locally, stored in IndexedDB, and never sent anywhere.
 */
export function AddEvidenceForm({ skills, onAdded }: { skills: Skill[]; onAdded: (artifactId: string) => void }) {
  const { apply } = useData();
  const { run, busy, error } = useAction();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EvidenceArtifact["kind"]>("write-up");
  const [claim, setClaim] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<EvidenceArtifact["visibility"]>("private");
  const [redaction, setRedaction] = useState<Redaction>("none");
  const [fileKey, setFileKey] = useState(0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      let text = content;
      let sha256: string | undefined;
      let mediaType = "text/plain";
      if (file) {
        if (file.size > MAX_FILE_BYTES) throw new Error("That file is larger than 5 MB.");
        const bytes = await file.arrayBuffer();
        sha256 = await sha256Hex(bytes);
        mediaType = file.type || "application/octet-stream";
        text = isTextLike(file.type, file.name) ? new TextDecoder().decode(bytes) : "";
      } else if (text) {
        sha256 = await sha256Hex(utf8(text));
      }
      if (text.length > MAX_CONTENT_CHARS) throw new Error("That text is too long to store as evidence.");
      let artifactId = "";
      await apply((data, ctx) => {
        const r = addEvidence(
          data,
          {
            title,
            kind,
            content: text,
            ...(sha256 ? { sha256 } : {}),
            mediaType,
            captureMethod: file ? "local-file" : "manual",
            sourceLabel: file ? `Local file: ${file.name}` : "Typed in Evidence Vault",
            claim,
            skillIds,
            visibility,
            redaction,
          },
          ctx,
        );
        artifactId = r.artifactId;
        return r.data;
      });
      setTitle("");
      setClaim("");
      setContent("");
      setFile(null);
      setFileKey((k) => k + 1);
      setSkillIds([]);
      onAdded(artifactId);
    });
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3" aria-label="Add evidence">
      <div>
        <label htmlFor="ev-title" className={labelClass}>
          Title
        </label>
        <input id="ev-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="ev-kind" className={labelClass}>
            Kind
          </label>
          <select id="ev-kind" className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as EvidenceArtifact["kind"])}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ev-visibility" className={labelClass}>
            Visibility
          </label>
          <select
            id="ev-visibility"
            className={inputClass}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as EvidenceArtifact["visibility"])}
          >
            {VisibilitySchema.options.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ev-redaction" className={labelClass}>
            Redaction
          </label>
          <select id="ev-redaction" className={inputClass} value={redaction} onChange={(e) => setRedaction(e.target.value as Redaction)}>
            {RedactionSchema.options.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="ev-claim" className={labelClass}>
          What does this show? (your claim)
        </label>
        <textarea id="ev-claim" className={inputClass} rows={2} value={claim} onChange={(e) => setClaim(e.target.value)} required maxLength={1000} />
      </div>
      <div>
        <label htmlFor="ev-content" className={labelClass}>
          Evidence text <span className="font-normal text-[var(--fg-muted)]">(optional)</span>
        </label>
        <textarea
          id="ev-content"
          className={inputClass}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={file !== null}
        />
      </div>
      <div>
        <label htmlFor="ev-file" className={labelClass}>
          …or a local file <span className="font-normal text-[var(--fg-muted)]">(read and hashed in this browser, max 5 MB)</span>
        </label>
        <input key={fileKey} id="ev-file" type="file" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      {skills.length > 0 && (
        <fieldset>
          <legend className={labelClass}>Skills this claim is about</legend>
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {skills.map((s) => (
              <label key={s.id} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={skillIds.includes(s.id)}
                  onChange={(e) => setSkillIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((i) => i !== s.id)))}
                />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <ErrorText error={error} />
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Saving…" : "Save to vault"}
      </Button>
    </form>
  );
}
