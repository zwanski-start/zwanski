"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { NAV_ITEMS, isActive, navDescKey, navLabelKey } from "@/lib/nav";

export function Nav() {
  const pathname = usePathname() ?? "/";
  const { t } = useI18n();
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
                title={t(navDescKey(item))}
                className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-[var(--surface)]"
                    : "text-[var(--fg)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                {t(navLabelKey(item))}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
