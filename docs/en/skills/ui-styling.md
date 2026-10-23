---
name: ui-styling
description: "shadcn/ui and shadcn-vue + Tailwind: implement accessible components in Next, Vue/Inertia or Astro. Use it AFTER ui-ux-pro-max (this one does not choose style, palette or pattern: it only implements components with the tokens already decided)."
origen: core/skills-overlay/ui-styling/SKILL.md
huella: d9135d9ccc08
---

# ui-styling (Senzu layer)

Upstream skill (English): `SKILL.upstream.md` (stack, quick start, reference map, patterns),
`references/shadcn-components.md`, `shadcn-theming.md`, `shadcn-accessibility.md`, `tailwind-utilities.md`,
`tailwind-responsive.md`, `tailwind-customization.md`, `canvas-design-system.md`, `scripts/shadcn_add.py`,
`scripts/tailwind_config_gen.py`. Senzu's own layer: `references/es/vue-shadcn.md`.

This is where the UI is **implemented**: which component, how it is installed, how it is styled with tokens. The decision on style,
palette, typography and page pattern is made by `ui-ux-pro-max` and lives in `senzu/design-system/<slug>/MASTER.md`; tokens
are declared following `ui-ux-pro-max/references/es/tokens-tailwind.md` (Tailwind 4 `@theme` + semantic tokens + `.dark`).

## 1. When to use / when not
| Situation | Skill |
|---|---|
| Add/compose shadcn components, forms, tables, dialogs, responsive layouts, dark mode | **ui-styling** |
| Choose visual style, palette, typography, page pattern; generate the design system | `ui-ux-pro-max` |
| 3-layer token architecture, token JSON, validation of loose hex values | `design-system` |
| Component animation | `motion-framer` (React) / `gsap-scrolltrigger` |
| Posters/visual design on canvas (`canvas-design-system.md`) | outside Senzu's scope; ignore unless explicitly requested |

## 2. Minimum reading per task
| Task | File and lines |
|---|---|
| Init and add components (React) | `SKILL.upstream.md` 56-112 |
| Component catalog with examples (Button… Badge) | `references/shadcn-components.md` 5-424 (RHF+zod forms: 43-81; Data Table: 383-405) |
| Dark mode with next-themes, CSS vars, `cva` variants, radius | `references/shadcn-theming.md` 5-94, 95-152, 247-317, 348-364 |
| Keyboard, focus, ARIA, accessible forms | `references/shadcn-accessibility.md` 16-104, 191-273, 384-431 |
| `@theme`, semantic colors, fonts, `@utility`, variants, layers | `references/tailwind-customization.md` 5-85, 86-142, 143-250 |
| Responsive, container queries | `references/tailwind-responsive.md` |
| Layout/spacing/typography utilities | `references/tailwind-utilities.md` |
| Form with validation (full pattern) | `SKILL.upstream.md` 261-298 |

## 3. Integration by Senzu profile
| Profile | Installation | Specifics |
|---|---|---|
| Next.js App Router | `npx shadcn@latest init` → `npx shadcn@latest add button card dialog form` | Components in `components/ui/*` (your own code, versioned); `next-themes` for dark mode with `attribute="class"`; forms with `react-hook-form` + `zod` or server actions + `useActionState`; `cn()` in `lib/utils.ts`. |
| Vue 3 / Laravel + Inertia | `npx shadcn-vue@latest init` → `npx shadcn-vue@latest add button …` (Reka UI + `class-variance-authority`) | `components.json` with Vite/Inertia aliases; forms with `vee-validate` + `zod` or Inertia's `useForm`; tables with `@tanstack/vue-table`; dark mode with a class on `<html>` and an inline script in `app.blade.php`. Details: `references/es/vue-shadcn.md`. |
| Astro | Islands: shadcn/ui in a React island or shadcn-vue in a Vue island (`client:visible`); if there is no interactivity, just Tailwind 4 + HTML | A single islands framework per project; static components (Card, Badge) are replicated in `.astro` with the same classes. |
| Vue 3 SPA (Vite) | same as Inertia without the Laravel part | `vue-router` + Pinia; `<Transition>` for simple states. |

Tokens: primitives in `@theme` (`--color-brand-*`, `--font-*`, `--radius-*`), semantic tokens in `:root`/`.dark`
(`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`…) exposed with `@theme inline`,
as shadcn 2025 does (`shadcn-theming.md` 95-152). Values come from `MASTER.md`; hex values are not copied from upstream.

## 4. Hard rules
- **A single component library** per project (shadcn/ui or shadcn-vue); no MUI/Vuetify/Element/PrimeVue
  added "for one component". If something is missing, compose it with Radix/Reka or ask for approval.
- Variants with `cva` in the component itself (`variant`, `size`); no loose conditional classes repeated on every use.
- Do not override the base styles of `components/ui/*` by hand with `!important` or global CSS; adjust the tokens or
  add a variant. One-off overrides via `className`/`class` with `cn()`.
- Radix/Reka accessibility is respected: do not remove `DialogTitle`, `Label`, roles, nor use `asChild` in a way that changes semantics;
  `Dialog` always with a title (visible or `sr-only`) and a description or `aria-describedby={undefined}`.
- No loose hex or px values repeated: if a value appears twice, it is a token (`design-system` validates it).
- Dark mode with a class on `<html>`, inline script before paint, `color-scheme` declared; contrast verified in both.
- Icons `lucide-react` / `lucide-vue-next` with `aria-hidden` and accessible text; never emojis as icons.
- Forms: visible `Label`, error with `aria-invalid` + `aria-describedby`, `autocomplete`, focus on the first error,
  button with a submitting state (`disabled` + spinner + text).
- Responsive 375–1440 without horizontal scroll; `container` + `@container` when the component lives at several widths.

## 5. Quick decisions
| Need | Solution |
|---|---|
| CRUD with table, filters, pagination | Data Table (TanStack) + search `Input` + actions `DropdownMenu`; server-side in Inertia/Next |
| Long form | `Form` + `FormField` (React) / shadcn-vue `Form` + `FormField` with vee-validate; sections with `Separator` |
| App side menu | shadcn (or shadcn-vue) `Sidebar` + `Sheet` on mobile |
| Multiple selection / autocomplete | `Command` + `Popover` (combobox) |
| Notifications | `sonner` (`vue-sonner` in Vue); never `alert()` |
| Empty/loading states | `Skeleton` while loading; empty state with icon, text and CTA |
| Component that does not exist in shadcn | Compose with Radix/Reka primitives + `cva`, same file style as the generated ones |

## 6. Expected output
Before the code: profile, components to install (exact command), tokens being touched. After: code + check
of states (hover/focus/disabled/error/loading), keyboard, dark mode and 375/768/1440.
