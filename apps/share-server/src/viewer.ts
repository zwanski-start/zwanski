/**
 * The read-only public share page (`GET /s/<id>#k=<key>`). Self-contained: one inline style and
 * one inline script, both pinned by SHA-256 in the page CSP (`default-src 'none'`), no external
 * resources. The script reads the key from the fragment (never sent to the server), fetches the
 * ciphertext from this origin, decrypts it with WebCrypto and renders it with `textContent` only.
 */

const STYLE = `
:root{color-scheme:light dark;--bg:#f7f4ee;--fg:#1f1f1d;--muted:#57554f;--accent:#0f6b63;--border:#d6d1c6}
@media (prefers-color-scheme:dark){:root{--bg:#1b1b1a;--fg:#ece8e0;--muted:#b3aea4;--accent:#5fc4b8;--border:#3a3935}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
main{max-width:46rem;margin:0 auto;padding:2rem 1rem}h1{font-family:Georgia,serif;font-size:1.8rem;margin:.2rem 0}
.muted{color:var(--muted);font-size:.9rem}.notice{border:1px solid var(--border);border-radius:6px;padding:.6rem .8rem;font-size:.9rem}
.status{display:inline-block;border:1px solid var(--accent);color:var(--accent);border-radius:999px;padding:0 .5rem;font-size:.8rem;margin-inline-end:.4rem}
li{margin:.5rem 0}a{color:var(--accent)}:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
`;

const SCRIPT = `
(async function () {
  var state = document.getElementById("state");
  var out = document.getElementById("dossier");
  var LABEL = { "supported": "Supported", "uncertain": "Uncertain", "not-yet-supported": "Not yet supported", "not-applicable": "Not applicable", "unknown": "Unknown" };
  function say(t) { state.textContent = t; }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = String(text); if (cls) e.className = cls; return e; }
  function bytes(s) {
    if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error("bad encoding");
    var b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
    var u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u;
  }
  var id = location.pathname.split("/").pop() || "";
  var key = new URLSearchParams(location.hash.slice(1)).get("k");
  if (!key) { say("This link is incomplete: the decryption key after # is missing."); return; }
  var res;
  try { res = await fetch("/api/shares/" + encodeURIComponent(id), { cache: "no-store", credentials: "omit" }); }
  catch (e) { say("The share service could not be reached."); return; }
  if (res.status === 410) {
    var gone = await res.json().catch(function () { return {}; });
    say(gone.state === "revoked" ? "This share was revoked by its owner." : "This share has expired.");
    return;
  }
  if (res.status === 429) { say("Too many requests. Try again in a minute."); return; }
  if (!res.ok) { say("This share does not exist."); return; }
  var body = await res.json();
  var dossier;
  try {
    var k = await crypto.subtle.importKey("raw", bytes(key), "AES-GCM", false, ["decrypt"]);
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(body.iv), additionalData: new TextEncoder().encode("proofbridge.share.v1") }, k, bytes(body.ciphertext));
    dossier = JSON.parse(new TextDecoder().decode(plain));
  } catch (e) { say("This share could not be decrypted (wrong or damaged link)."); return; }
  if (!dossier || dossier.format !== "proofbridge.dossier" || !Array.isArray(dossier.requirements) || !dossier.opportunity) {
    say("This share does not contain a ProofBridge dossier."); return;
  }
  say("");
  state.hidden = true;
  var o = dossier.opportunity;
  out.append(el("p", "Read-only shared dossier", "muted"));
  out.append(el("h1", o.title));
  out.append(el("p", [o.organization, o.kind].filter(Boolean).join(" · "), "muted"));
  var exp = el("p", "This link expires " + new Date(body.expiresAt).toUTCString() + ". The owner can revoke it at any time. Copies that were already saved, printed or screenshotted cannot be revoked.", "notice");
  out.append(exp);
  out.append(el("p", dossier.notice, "muted"));
  var h = el("h2", "Requirements"); out.append(h);
  var ul = el("ul");
  dossier.requirements.forEach(function (r) {
    var li = el("li");
    var p = el("p"); p.append(el("span", LABEL[r.status] || "Unknown", "status")); p.append(el("strong", r.text)); li.append(p);
    li.append(el("p", r.rationale, "muted"));
    if (Array.isArray(r.evidence) && r.evidence.length) {
      var ev = el("ul");
      r.evidence.forEach(function (e) {
        var item = el("li", e.claim + " — " + (e.artifact && e.artifact.title || ""));
        if (e.artifact && e.artifact.excerpt) item.append(el("q", e.artifact.excerpt, "muted"));
        ev.append(item);
      });
      li.append(ev);
    }
    ul.append(li);
  });
  out.append(ul);
  out.append(el("p", (Number(dossier.withheld) || 0) + " evidence item(s) withheld by the owner (private or redacted).", "muted"));
  document.title = o.title + " — shared dossier";
})();
`;

async function sha256b64(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  let bin = "";
  for (const b of new Uint8Array(d)) bin += String.fromCharCode(b);
  return btoa(bin);
}

let cached: { html: string; csp: string } | undefined;

export async function viewerPage(): Promise<{ html: string; csp: string }> {
  if (cached) return cached;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Shared dossier — ProofBridge</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<p id="state" role="status" aria-live="polite">Decrypting in your browser…</p>
<article id="dossier" aria-label="Shared dossier"></article>
<noscript><p>This page decrypts the dossier in your browser and needs JavaScript.</p></noscript>
</main>
<script>${SCRIPT}</script>
</body>
</html>`;
  const csp = [
    "default-src 'none'",
    `script-src 'sha256-${await sha256b64(SCRIPT)}'`,
    `style-src 'sha256-${await sha256b64(STYLE)}'`,
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
  cached = { html, csp };
  return cached;
}
