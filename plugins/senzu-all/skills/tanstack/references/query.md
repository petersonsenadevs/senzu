# TanStack Query (v5): estado del servidor

El estado del servidor (datos remotos) es distinto del estado de cliente: llega tarde, se queda viejo, se
comparte entre pantallas y puede fallar. Query lo gestiona (caché, recarga, reintentos, invalidación) para no
reinventarlo con `useEffect`+`useState`. Paquetes: `@tanstack/react-query`, `@tanstack/vue-query`,
`@tanstack/svelte-query`, `@tanstack/solid-query` (misma API).

## Índice
1. Montaje · 2. Query de lectura · 3. queryKey (clave) · 4. Mutaciones e invalidación · 5. Infinite ·
6. SSR (Next/Nuxt) · 7. Errores y estados · 8. Errores típicos

## 1. Montaje
Un `QueryClient` en la raíz; opciones por defecto sensatas en un sitio (no repartidas):
```ts
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: false } } });
// React: <QueryClientProvider client={qc}>   Vue: app.use(VueQueryPlugin, { queryClient: qc })
```
- `staleTime`: cuánto se considera fresco (sin refetch). Datos que cambian poco → alto.
- Fetch real: tu `LlmClient`-equivalente para HTTP (un `api` con fetch/axios), nunca la URL cruda esparcida.

## 2. Query de lectura
```ts
const { data, isPending, isError, error } = useQuery({
  queryKey: ['pedidos', { estado, page }],
  queryFn: ({ signal }) => api.get('/pedidos', { params: { estado, page }, signal }),
});
```
- `queryFn` recibe `signal` (AbortController): pásalo al fetch para cancelar al desmontar/cambiar key.
- v5: estados `isPending` (sin datos aún), `isError`, y `isFetching` (recargando con datos ya pintados).

## 3. queryKey (la clave)
- Describe EXACTAMENTE los datos: entidad + parámetros que cambian el resultado (filtros, página, orden,
  idioma y, en multi-tenant, el tenant). `['pedidos', { estado, page, tenantId }]`.
- Dos componentes con la misma key comparten caché y una sola petición. Una key incompleta sirve datos de otro
  filtro; una key sin `tenantId` puede servir datos de otro cliente (fuga). Serializable y estable.

## 4. Mutaciones e invalidación
```ts
const qc = useQueryClient();
const m = useMutation({
  mutationFn: (dto) => api.post('/pedidos', dto),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),  // recarga lo afectado, no todo
});
```
- Tras cambiar datos, **invalida** las queries afectadas; no recargues la página ni refetch global.
- Optimistic update solo si la UX lo pide: `onMutate` guarda el estado previo y `onError` lo revierte.

## 5. Infinite (scroll / "cargar más")
```ts
const q = useInfiniteQuery({
  queryKey: ['feed'], initialPageParam: 0,
  queryFn: ({ pageParam }) => api.get('/feed', { params: { cursor: pageParam } }),
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});
```
- Paginación por CURSOR mejor que por offset (estable al insertarse filas). `fetchNextPage()` al llegar al
  final (IntersectionObserver). Para pintar miles, combínalo con TanStack Virtual (`table-virtual.md`).

## 6. SSR (Next App Router / Nuxt)
- Prefetch en el servidor y pasa el estado deshidratado al cliente: NO dobles el fetch.
```ts
// Next (server component)
const qc = new QueryClient(); await qc.prefetchQuery({ queryKey:['pedidos'], queryFn });
return <HydrationBoundary state={dehydrate(qc)}><Client/></HydrationBoundary>;
```
- Datos puros de servidor que no cambian en cliente: a veces un Server Component con fetch nativo basta y no
  necesitas Query (no metas Query "por reflejo" en todo).

## 7. Errores y estados
- Siempre tres caminos en la UI: cargando (skeleton, no spinner infinito), error (mensaje honesto + reintentar),
  vacío (no confundir con error). `error` tipado; no tragues el fallo.
- `retry` solo en transitorios; un 404/403 no se reintenta. Timeout en el `api`.

## 8. Errores típicos
- Meter datos de servidor en Redux/Pinia a mano (doble fuente de verdad) · queryKey incompleta (datos de otro
  filtro/tenant) · refetch manual tras mutar en vez de invalidar · `useEffect` que llama a `refetch` en bucle ·
  traer 50k filas y paginar en cliente · doble fetch en SSR por no hidratar · `staleTime: 0` por defecto y
  tormenta de refetch al enfocar la ventana.
