"use client";

import { useState } from "react";
import { setProfileLanguages, type PersonProfile } from "@proofbridge/core";
import { Button, ErrorText, inputClass } from "@/components/ui";
import { useData } from "@/lib/data";
import { useAction } from "@/lib/useAction";

/** Lets the user state their working languages (feeds language requirements as "stated"). */
export function ProfileLanguages({ profile }: { profile: PersonProfile }) {
  const { apply } = useData();
  const { run, busy, error } = useAction();
  const [value, setValue] = useState(profile.languages.join(", "));
  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => apply((d, ctx) => setProfileLanguages(d, profile.id, value.split(","), ctx)));
      }}
    >
      <div className="min-w-40 flex-1">
        <label htmlFor="profile-languages" className="block text-sm">
          Working languages <span className="text-[var(--fg-muted)]">(comma-separated)</span>
        </label>
        <input id="profile-languages" className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} maxLength={300} />
      </div>
      <Button type="submit" disabled={busy}>
        Save
      </Button>
      <ErrorText error={error} />
    </form>
  );
}
