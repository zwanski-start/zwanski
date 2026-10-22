/**
 * Runs inside the captured tab (isolated world, via `chrome.scripting.executeScript`) only
 * after the user clicks a capture button. It must be self-contained: Chrome serialises the
 * function source. It reads plain text only — never markup, form values, cookies or storage —
 * and the caller re-sanitises the result because the page controls everything it sees.
 *
 * The isolated world has its own JS globals, so the page cannot monkey-patch
 * `getSelection`/`innerText` here; it can only choose what text it shows, which is why the
 * user previews the result before anything is queued.
 */
export function extractFromPage(mode: "selection" | "visible-text", maxChars: number): { text: string; title: string } {
  const clip = (s: unknown) => (typeof s === "string" ? s.slice(0, maxChars * 2) : "");
  const title = clip(document.title);
  if (mode === "selection") {
    const selection = window.getSelection();
    return { text: clip(selection ? selection.toString() : ""), title };
  }
  // `innerText` is the rendered text: display:none / hidden content and <script>/<style> are excluded.
  const root = document.querySelector("main, [role='main'], article") ?? document.body;
  return { text: clip(root instanceof HTMLElement ? root.innerText : ""), title };
}
