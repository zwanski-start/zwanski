import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "./components/Nav";

export const metadata: Metadata = {
  title: "ProofBridge OS",
  description:
    "Turn real work into portable proof, and portable proof into realistic next steps. Local-first, private by default.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap">
            <div className="brand">
              ProofBridge&nbsp;<small>OS</small>
            </div>
            <Nav />
            <span className="local-badge" title="The demo runs entirely in your browser with no API key.">
              ● Local-only mode
            </span>
          </div>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
