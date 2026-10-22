"use client";

import { useEffect, useMemo } from "react";
import type { RequirementStatus } from "@proofbridge/core";
import { useLocalValue } from "./localStore";
import { MESSAGES, PDF_LABELS, type MessageKey } from "./messages";

export const LOCALES = ["en", "fr", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAME: Record<Locale, string> = { en: "English", fr: "Français", ar: "العربية" };
export const LOCALE_DIR: Record<Locale, "ltr" | "rtl"> = { en: "ltr", fr: "ltr", ar: "rtl" };
/** Intl locale per UI language. Arabic uses Latin digits so dates/ids match the evidence. */
const INTL_LOCALE: Record<Locale, string> = { en: "en", fr: "fr", ar: "ar-u-nu-latn" };

export const LOCALE_STORAGE_KEY = "proofbridge.locale";

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = MESSAGES[locale][key] ?? MESSAGES.en[key];
  return vars ? template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : template;
}

/** Arabic "medium" dates are all-numeric (02/02/2026), which reads ambiguously; spell the month. */
const DATE_OPTIONS: Record<Locale, Intl.DateTimeFormatOptions> = {
  en: { dateStyle: "medium" },
  fr: { dateStyle: "medium" },
  ar: { year: "numeric", month: "long", day: "numeric" },
};

export function formatDateFor(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...DATE_OPTIONS[locale], timeZone: "UTC" }).format(new Date(iso));
}

const DATE_TIME_OPTIONS: Record<Locale, Intl.DateTimeFormatOptions> = {
  en: { dateStyle: "medium", timeStyle: "short" },
  fr: { dateStyle: "medium", timeStyle: "short" },
  ar: { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" },
};

export function formatDateTimeFor(locale: Locale, iso: string): string {
  return `${new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...DATE_TIME_OPTIONS[locale], timeZone: "UTC" }).format(new Date(iso))} UTC`;
}

/**
 * Inline, pre-hydration script for <head>: applies the saved `lang`/`dir` before first paint
 * so an Arabic UI does not flash left-to-right. Only reads one whitelisted localStorage value.
 */
export const LOCALE_BOOT_SCRIPT = `try{var l=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});if(l==="fr"||l==="ar"){document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}}catch(e){}`;

export interface I18n {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  status: (s: RequirementStatus) => string;
  formatDate: (iso: string) => string;
  formatDateTime: (iso: string) => string;
  pdfLabels: (typeof PDF_LABELS)[Locale];
}

/** The current UI language (device-local preference, default English). */
export function useI18n(): I18n {
  const [stored, setStored] = useLocalValue(LOCALE_STORAGE_KEY);
  const locale: Locale = isLocale(stored) ? stored : "en";
  return useMemo(
    () => ({
      locale,
      dir: LOCALE_DIR[locale],
      setLocale: (l: Locale) => setStored(l),
      t: (key, vars) => translate(locale, key, vars),
      status: (s) => translate(locale, `status.${s}`),
      formatDate: (iso) => formatDateFor(locale, iso),
      formatDateTime: (iso) => formatDateTimeFor(locale, iso),
      pdfLabels: PDF_LABELS[locale],
    }),
    [locale, setStored],
  );
}

/** Keeps <html lang dir> in sync with the chosen language. Render once, in the root layout. */
export function DocumentLocale() {
  const { locale, dir } = useI18n();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);
  return null;
}
