"use client";

import { LOCALES, LOCALE_NAME, useI18n, type Locale } from "@/lib/i18n";

/** Localized pieces of the root layout (the layout itself is a server component). */
export function SkipLink() {
  const { t } = useI18n();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:rounded focus:bg-[var(--surface)] focus:px-3 focus:py-2"
    >
      {t("shell.skip")}
    </a>
  );
}

export function LocalOnlyBadge() {
  const { t } = useI18n();
  return (
    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]" title={t("shell.localOnlyTitle")}>
      {t("shell.localOnly")}
    </span>
  );
}

export function LanguageSelect({ id = "ui-language", label }: { id?: string; label?: string }) {
  const { t, locale, setLocale } = useI18n();
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <label htmlFor={id} className={label ? "font-medium" : "sr-only"}>
        {label ?? t("shell.language")}
      </label>
      <select
        id={id}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAME[l]}
          </option>
        ))}
      </select>
    </span>
  );
}

export function Footer() {
  const { t } = useI18n();
  return <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-[var(--fg-muted)]">{t("shell.footer")}</footer>;
}
