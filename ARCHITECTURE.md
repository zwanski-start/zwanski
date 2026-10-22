# ARCHITECTURE

> Placeholder — the architect must document real boundaries and dataflows here (no invented
> container isolation). Target shape (directive §4): TypeScript pnpm monorepo —
> `apps/{web,extension}`, `packages/{core,evidence,storage,graph,ai,ui,fixtures,config}`, `ops/`, `docs/`.
> Offline-first IndexedDB/Dexie with versioned migrations; deterministic matching without an LLM;
> optional AI adapters opt-in and disabled by default.
