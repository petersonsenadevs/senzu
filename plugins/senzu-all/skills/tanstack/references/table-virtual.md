# TanStack Table + Virtual (v5): tablas y listas grandes

Table es **headless**: te da el modelo (columnas, orden, filtro, paginación, selección, agrupación) y TÚ pintas
el `<table>` con los tokens del design system y la accesibilidad. Virtual "ventaniza" listas/tablas enormes
(pinta solo lo visible). Paquetes: `@tanstack/react-table` / `@tanstack/vue-table` (+ `-svelte`/`-solid`) y
`@tanstack/react-virtual` (+ adaptadores).

## Índice
1. Tabla mínima · 2. Orden/filtro/paginación (cliente) · 3. Modo servidor (manual) · 4. Selección y columnas ·
5. Virtualización · 6. Accesibilidad y móvil · 7. Errores típicos

## 1. Tabla mínima (React; Vue igual con su adaptador)
```ts
const table = useReactTable({
  data, columns,
  getCoreRowModel: getCoreRowModel(),
});
// pintas: table.getHeaderGroups() -> <thead>, table.getRowModel().rows -> <tbody>
```
- `columns` con `accessorKey`/`accessorFn` + `header`/`cell` (el `cell` puede devolver tu componente).
- `data` ESTABLE entre renders (useMemo / ref): si cambia de identidad cada render, la tabla se recalcula entera.

## 2. Orden, filtro, paginación en CLIENTE (pocos datos ya cargados)
- Añade los row models y el estado: `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`.
- Vale para cientos de filas ya en memoria. Para miles o datos remotos grandes → modo servidor (abajo).

## 3. Modo SERVIDOR (manual): la tabla grande de verdad
La regla dura: no traigas 50k filas al navegador. El servidor ordena, filtra y pagina; la tabla solo refleja.
```ts
const table = useReactTable({
  data, columns, getCoreRowModel: getCoreRowModel(),
  manualPagination: true, manualSorting: true, manualFiltering: true,
  rowCount: total,                 // total del servidor, para el paginador
  state: { pagination, sorting, columnFilters },
  onPaginationChange: setPagination, onSortingChange: setSorting, onColumnFiltersChange: setFilters,
});
```
- `pagination`/`sorting`/`filters` van en la `queryKey` de TanStack Query (`query.md`): cambian → nueva
  petición. El endpoint los recibe y responde la página + el total (`code-quality §api-design.md`).
- Así se combinan Query (trae la página) y Table (modela orden/filtro/selección) sin pelearse.

## 4. Selección y columnas
- Selección de filas: `enableRowSelection` + `getRowId` estable (el id real, no el índice); en modo servidor,
  "seleccionar todo" significa "todos los que cumplen el filtro", decídelo explícitamente (no solo la página).
- Mostrar/ocultar y reordenar columnas: `columnVisibility`, `columnOrder`. Fijar columnas: `columnPinning`.
- Evita meter lógica de negocio en el `cell`; el `cell` pinta, el dato ya viene calculado.

## 5. Virtualización (TanStack Virtual) — solo con muchas filas
```ts
const rows = table.getRowModel().rows;
const v = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => 44, overscan: 8 });
// pintas v.getVirtualItems() con translateY; el contenedor tiene la altura total v.getTotalSize()
```
- Úsalo cuando el DOM se ahoga (miles de filas/ítems). `estimateSize` realista; `overscan` pequeño.
- Rompe el scroll nativo, Ctrl+F del navegador y el foco: compénsalo (buscador propio, saltar a fila, foco
  gestionado). Si no hace falta, NO lo metas: complica accesibilidad para nada.

## 6. Accesibilidad y móvil (headless no lo da gratis)
- `<table>` semántica: `<th scope="col">`, caption o aria-label, orden anunciado (`aria-sort`).
- Teclado: foco visible, ordenar/seleccionar con Enter/Espacio. Compruébalo con `ui-verify` (375px primero).
- Móvil: una tabla ancha no cabe. Decide por sección (movil.md): scroll horizontal con sombra, columnas
  prioritarias, o tarjetas apiladas en vez de tabla. No encojas el texto a 10px.

## 7. Errores típicos
- Traer todo y paginar en cliente cuando son miles (se debía paginar en servidor) · `data`/`columns` recreados
  cada render (tabla se recalcula, parpadea) · `getRowId` por índice (la selección salta al reordenar) ·
  virtualizar sin necesidad (rompe búsqueda y accesibilidad) · "seleccionar todo" que solo marca la página
  visible · meter el estado de la tabla en el store global en vez de local + queryKey.
