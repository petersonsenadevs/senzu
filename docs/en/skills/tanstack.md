---
name: tanstack
description: "Headless TanStack for data: Query (server state: fetch, cache, invalidation, infinite, SSR), Table (sort/filter/pagination, client or server) and Virtual (huge lists). React, Vue, Svelte, Solid. For dashboards and data tables."
origen: core/skills/tanstack/SKILL.md
huella: 61a371287e4a
---

# tanstack (Senzu)

TanStack **headless** libraries (logic without styles) for what data UI does badly by hand: server
state, tables and huge lists. Headless = you provide the markup and the design system tokens
(`ui-ux-pro-max`); TanStack provides the logic. Truly multi-framework: React, Vue, Svelte, Solid (same API,
one adapter per framework). USE IT after `ui-ux-pro-max` (style and pattern decided) and with `ui-styling` for the
base components; the data mechanics go here.

## Minimal reading per task
| Task | Read only |
|---|---|
| Server data: fetch with cache, mutations, invalidation, infinite, SSR | `references/query.md` |
| Table with sorting, filtering, pagination, selection (client or server) and virtualization | `references/table-virtual.md` |
| Style, palette, pattern of the view (before anything else) | `ui-ux-pro-max` |
| Accessible base components (shadcn) to build the table on | `ui-styling` |
| Design of the endpoint that feeds the table (server-side pagination, filters) | `code-quality §references/api-design.md` |

## When yes and when no
- **Query (server state)**: as soon as there is fetch + cache + reload. It replaces hand-written `useEffect`+`useState`
  and putting server data in the global store (Redux/Pinia): the server is NOT client state.
- **Table**: tables with sorting/filtering/pagination/selection. Headless: it imposes no design or accessibility (you
  add those). For a simple list of 10 rows, it's not needed: a `map` is enough.
- **Virtual**: only when you render thousands of rows/items and the DOM chokes. Don't add it "just in case".
- It is NOT a styled data grid (it's not AG Grid): if the client wants a complete turnkey spreadsheet,
  evaluate that other option; TanStack is pieces you assemble.

## Hard rules
1. **The server is not client state**: remote data → Query; UI state (open modal, tab) → local
   state or store. Don't mix them.
2. **The `queryKey` describes the data** (includes filters/page/tenant): `['pedidos', { estado, page }]`. A
   badly built key serves data from another filter or another user (tenant isolation, in the key too).
3. **Large table = pagination/sorting/filtering on the SERVER** (Table manual mode + Query), not bringing 50k
   rows to the browser. The endpoint paginates and filters (`code-quality §api-design`).
4. **Headless isn't accessible by itself**: you add semantic `<table>`, `scope`, focus and keyboard (ui-ux-pro-max,
   ui-verify). Virtual breaks native scrolling and the browser's find: use it only if it's really needed.
5. **Invalidate, don't reload by hand**: after a mutation, `invalidateQueries` for what changed; no
   remounting the component or global refetch.
6. **SSR (Next/Nuxt)**: prefetch on the server + hydrate; don't double the fetch on the client (`references/query.md`).

## Version and relationship with other skills
TanStack v5 (`@tanstack/react-query`, `@tanstack/vue-query`, `@tanstack/react-table`, `@tanstack/react-virtual`).
`ui-ux-pro-max` decides style and pattern · `ui-styling` builds the components · `code-quality` the endpoint that
feeds the table · `ui-verify` checks the table on mobile and with the keyboard · to animate rows, `motion-framer`.
