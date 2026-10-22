import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer, LanguageSelect, LocalOnlyBadge, SkipLink } from "@/components/Shell";
import { DataProvider } from "@/lib/data";
import { DocumentLocale, LOCALE_BOOT_SCRIPT } from "@/lib/i18n";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "ProofBridge OS",
  description: "Turn real work into portable proof, and portable proof into realistic next steps.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // lang/dir are set before paint from the saved language (see LOCALE_BOOT_SCRIPT).
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <DocumentLocale />
        <SkipLink />
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xl">ProofBridge</span>
              <LocalOnlyBadge />
              <LanguageSelect />
            </div>
            <Nav />
          </div>
        </header>
        <DataProvider>
          <main id="main" className="mx-auto max-w-5xl px-4 py-8">
            {children}
          </main>
        </DataProvider>
        <Footer />
        <ServiceWorker />
      </body>
    </html>
  );
}
