export interface NavItem {
  href: string;
  label: string;
  description: string;
}

/** Primary navigation — one entry per directive §2 screen built so far. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Compass", description: "Today’s next action and open evidence gaps" },
  { href: "/evidence", label: "Evidence Vault", description: "Sources, artifacts and claims" },
  { href: "/opportunities", label: "Opportunity Lab", description: "Requirements and their evidence status" },
  { href: "/graph", label: "Proof Graph", description: "Evidence → claim → skill → requirement → opportunity → next step" },
  { href: "/plan", label: "Bridge Plan", description: "Small tasks that close evidence gaps" },
  { href: "/share", label: "Share Studio", description: "Selective dossier export (Phase 1)" },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
