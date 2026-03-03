# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Start development server
pnpm build    # Build for production
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

> Use `pnpm` as the package manager (pnpm-lock.yaml is present). There are no test commands configured.

## Architecture

**Next.js App Router** application with fully client-side state — no backend API. All data is persisted in `localStorage` under the key `"lavamin-data"`.

### State Management

All application state lives in `lib/store.tsx` via a React Context (`StoreContext`). Every page consumes this context via the `useStore()` hook. The store handles:
- CRUD operations for all entities
- Automatic localStorage persistence
- Data migration when the schema changes
- Seed data fallback on first load

### Core Data Models (`lib/types.ts`)

| Entity | Description |
|--------|-------------|
| `Group` | Work crew (cuadrilla) |
| `Worker` | Individual miner (minero), belongs to a `Group` |
| `GarmentType` | Clothing type with price per unit (prenda) |
| `Order` | Laundry order with status lifecycle: `recibido → lavando → listo → entregado` |
| `ValorizacionPeriod` | Billing period containing `Acta` and `Guia` documents |

### Pages (`app/`)

| Route | Feature |
|-------|---------|
| `/` | Dashboard with summary stats |
| `/ordenes` | Order management (create, filter by status/group, status updates) |
| `/grupos` | Work team (cuadrilla) management |
| `/mineros` | Worker management, linked to groups |
| `/prendas` | Garment type catalog with pricing |
| `/valorizacion` | Billing records — generates PDF via jsPDF |
| `/reportes` | Analytics with Recharts visualizations |

### UI Stack

- **Tailwind CSS v4** + **shadcn/ui** (`new-york` variant, defined in `components.json`)
- All shadcn/ui components live in `components/ui/`
- Custom business components live directly in `components/`
- Icons via `lucide-react`
- Toast notifications via `sonner`

### Key Config Notes

- `next.config.mjs` ignores TypeScript build errors (`ignoreBuildErrors: true`) and disables image optimization (`unoptimized: true`)
- Path alias `@/*` maps to the project root (configured in `tsconfig.json`)
- Vercel Analytics is integrated in the root layout
