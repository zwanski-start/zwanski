"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "@/lib/nav";

export function Nav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Primary">
      <ul className="flex flex-wrap gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.description}
                className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-[var(--surface)]"
                    : "text-[var(--fg)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
