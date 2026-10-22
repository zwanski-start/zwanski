// Vite replaces `import.meta.env.MODE` at build time ("production", or "e2e" for the test build).
interface ImportMetaEnv {
  readonly MODE: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
