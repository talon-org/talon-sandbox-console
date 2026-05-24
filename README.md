# Talon Sandbox Console

SaaS dashboard for managing sandboxes, secrets, workers, tenants, and audit
logs on the Talon Sandbox runtime.

**Live:** https://app.sandbox.talon.net.cn _(coming soon)_

## Stack

- Vite 5 + React 18 + TypeScript 5
- Routing: `react-router-dom@^6` (HashRouter)
- State: `zustand`
- Design system: [`@talon-sandbox/react`](https://www.npmjs.com/package/@talon-sandbox/react) + [`@talon-sandbox/tokens`](https://www.npmjs.com/package/@talon-sandbox/tokens)

## Dev

```sh
pnpm install
pnpm dev
```

Open <http://localhost:5173>.

API base resolves to `/api` (same-origin) in production, expected to be reverse
proxied to the Talon Sandbox API. Override locally with `VITE_API_BASE` in
`.env.local`.

## Build

```sh
pnpm build
pnpm preview
```

## Project Layout

```
src/
├── App.tsx              Router + auth boot
├── store.ts             zustand global state + theme persistence
├── api/                 fetch wrappers (auth, sandboxes, secrets, …)
├── i18n/                EN/ZH dictionary + useT()
├── layouts/Shell.tsx    Sidebar + TopBar layout for in-shell pages
├── pages/Page*.tsx      11 pages (login, dashboard, sandboxes, …)
└── styles/private.css   Console-private layout tokens
```

## Implementation Spec

See [`docs/SPEC.md`](docs/SPEC.md) and [`docs/SPEC-pages.md`](docs/SPEC-pages.md).
Pages must follow the prototype designs 1:1 — no inventing layouts.

## License

MIT
