import type { MessageKey } from "./messages";

export interface NavItem {
  href: string;
  /** Message key for the label; `${key}.desc` is the description. */
  key: "compass" | "evidence" | "opportunities" | "graph" | "plan" | "inbox" | "share" | "settings";
}

/** Primary navigation — one entry per directive §2 screen built so far, plus Settings. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", key: "compass" },
  { href: "/evidence", key: "evidence" },
  { href: "/opportunities", key: "opportunities" },
  { href: "/graph", key: "graph" },
  { href: "/plan", key: "plan" },
  { href: "/inbox", key: "inbox" },
  { href: "/share", key: "share" },
  { href: "/settings", key: "settings" },
];

export const navLabelKey = (item: NavItem): MessageKey => `nav.${item.key}`;
export const navDescKey = (item: NavItem): MessageKey => `nav.${item.key}.desc`;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
