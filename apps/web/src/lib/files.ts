/** Local-only file helpers: hashing via WebCrypto, downloads via object URLs. No network. */

export async function sha256Hex(bytes: BufferSource): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const utf8 = (text: string) => new TextEncoder().encode(text);

/** Media types whose bytes are stored as text in the vault; anything else is hashed only. */
export const isTextLike = (type: string, name: string) =>
  type.startsWith("text/") || type === "application/json" || /\.(md|markdown|txt|csv|json)$/i.test(name);

export function downloadText(filename: string, text: string, type = "application/json") {
  downloadBlob(filename, new Blob([text], { type }));
}

export function downloadBytes(filename: string, bytes: Uint8Array<ArrayBuffer>, type: string) {
  downloadBlob(filename, new Blob([bytes], { type }));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
