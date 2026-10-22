import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { DataProvider } from "@/lib/data";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "ProofBridge OS",
  description: "Turn real work into portable proof, and portable proof into realistic next steps.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-[var(--surface)] focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xl">ProofBridge</span>
              <span
                className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]"
                title="All data stays in this browser's IndexedDB. No account, no network calls."
              >
                ● Local-only
              </span>
            </div>
            <Nav />
          </div>
        </header>
        <DataProvider>
          <main id="main" className="mx-auto max-w-5xl px-4 py-8">
            {children}
          </main>
        </DataProvider>
        <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-[var(--fg-muted)]">
          Phase 1 slice. Records badged DEMO / SYNTHETIC are invented. Nothing here is formally
          verified; a hash proves byte integrity, not authenticity.
        </footer>
        <ServiceWorker />
      </body>
    </html>
  );
}
