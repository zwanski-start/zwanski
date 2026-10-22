"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Compass" },
  { href: "/graph", label: "Proof Graph" },
  { href: "/vault", label: "Evidence Vault" },
  { href: "/opportunities", label: "Opportunity Lab" },
  { href: "/plan", label: "Bridge Plan" },
  { href: "/share", label: "Share Studio" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="main" aria-label="Primary">
      {LINKS.map((l) => {
        const current = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
