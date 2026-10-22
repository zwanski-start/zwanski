import { defineConfig } from "wxt";

/**
 * Public half of the key that pins the extension id (EXTENSION_ID in @proofbridge/core), so
 * the web app knows which extension to address. No private key exists in the repo; an
 * unpacked load only needs the public key.
 */
const PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6DPZ3br8j+67U05H+kaDJLPvxsUZ2u52yzLnimTPAAa+UKLWMhaeFY2PZGvmkoIvaaZbSU+IPApSLCxvDTv9xe8AOrYiY3bjaecR6Fdj+m8mQzM5N+zDbSz5ttQdNYU5JgK4h97+V/EyzXXhFQYQPji0B0hWJBQ43T7hyChcXDLEJCxBKxRnoeR2udCD5eqLbNX/cqp1yTlRqF4o7PmjB+5NlswMZFimKzJ9s86HGdrcsOqvp1fXP/3b4zg6hvzpkVjLv47WC42zNHSZV5Zc340/lbul3M6NPpiCzmd9MCrTevCziHDqdRB8DrMmhK+dvPFl5BiJ9YsH621aJ99EhQIDAQAB";

/**
 * Hosts the e2e build may script without a toolbar click (Playwright cannot click the
 * toolbar, so it cannot grant `activeTab`). The production build has no host permissions;
 * `scripts/audit-manifest.mjs` fails the build if that ever changes.
 */
const E2E_HOSTS = ["http://hostile.test/*"];

export default defineConfig({
  // No auto-imports: every dependency of extension code is an explicit import.
  imports: false,
  manifest: ({ mode }) => ({
    name: "ProofBridge Capture",
    description:
      "Capture a job listing or selected text into your local ProofBridge — only when you click, after you preview and confirm.",
    key: PUBLIC_KEY,
    // activeTab: read the current tab only after the user clicks the toolbar button.
    // scripting: run the one-shot text extractor in that tab. storage: hold the confirmed queue.
    permissions: ["activeTab", "scripting", "storage"],
    ...(mode === "e2e" ? { host_permissions: E2E_HOSTS } : {}),
    // Only a ProofBridge app on this machine may message the extension; the background also
    // checks the sender's exact origin against the app address the user configured.
    externally_connectable: { matches: ["http://localhost/*", "https://localhost/*", "http://127.0.0.1/*", "https://127.0.0.1/*"] },
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'" },
    action: { default_title: "ProofBridge: capture this page" },
    minimum_chrome_version: "116",
  }),
});
