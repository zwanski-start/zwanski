// Fails the build if the production manifest asks for more than the reviewed permissions.
// Run after `wxt build`; see SECURITY.md § Capture extension.
import { readFileSync } from "node:fs";

const path = new URL("../.output/chrome-mv3/manifest.json", import.meta.url);
const m = JSON.parse(readFileSync(path, "utf8"));
const problems = [];
const same = (a, b) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...b].sort());

if (m.manifest_version !== 3) problems.push("manifest_version must be 3");
if (!same(m.permissions, ["activeTab", "scripting", "storage"])) problems.push(`permissions: ${JSON.stringify(m.permissions)}`);
if (m.host_permissions?.length) problems.push(`host_permissions must be empty: ${JSON.stringify(m.host_permissions)}`);
if (m.optional_permissions?.length || m.optional_host_permissions?.length) problems.push("no optional permissions");
if (m.content_scripts?.length) problems.push("no content_scripts (capture runs only on click via activeTab)");
if (m.web_accessible_resources?.length) problems.push("no web_accessible_resources");
const allowed = ["http://localhost/*", "https://localhost/*", "http://127.0.0.1/*", "https://127.0.0.1/*"];
if (!same(m.externally_connectable?.matches, allowed) || m.externally_connectable?.ids?.length) {
  problems.push(`externally_connectable: ${JSON.stringify(m.externally_connectable)}`);
}
if (JSON.stringify(m).includes("<all_urls>")) problems.push("<all_urls> is not allowed");
if (!m.key) problems.push("key (pins the extension id) is missing");

if (problems.length) {
  console.error(`Manifest audit FAILED (${path.pathname}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`Manifest audit passed: permissions ${m.permissions.join(", ")}; no host permissions or content scripts.`);
