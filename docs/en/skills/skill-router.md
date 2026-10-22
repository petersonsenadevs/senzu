---
name: skill-router
description: "USE ME FIRST on any non-trivial task: decision tree that says which skill and section to read (UI: ui-ux-pro-max; animation, 3D, quality, DDD architecture, devlog) and detects the stack. Senzu's entry point; minimal context."
origen: core/skills-plugin/skill-router/SKILL.md
huella: bb1e7d760099
---

# skill-router (Senzu)

## Context loading protocol (mandatory)
1. **One skill per task** (two at most if the task spans UI + logic). Read its `SKILL.md`; do not read others "just in case".
2. Inside the skill, follow its **"Minimum reading per task"** table: read only that section/reference.
3. `SKILL.upstream.md` and `references/` **are read by sections** (Read with offset/limit or Grep over the line map), never whole.
4. Do not reread what was already read in the session; note in your reasoning which skill/section you used.
5. When the specialized part is done, go back to the project context (`CLAUDE.md`/`AGENTS.md`, `senzu/design-system/*/MASTER.md`).
6. If a needed skill is not installed, say so and propose installing it (`sync.ps1 -Skills …`, `-Bundle …`, `/plugin install …`); do not improvise that library.

## 1. Detect the stack (never assume it)
`senzu/senzu.json` (`stack`, `frontProfile`) → if it does not exist: `composer.json` (`laravel/framework`, `inertiajs/inertia-laravel`),
`package.json` (`next`, `astro`, `vue`, `react`), `pyproject.toml` (`fastapi`, `langgraph`). If it is not clear, ask.

## Decision tree (start here)
Full trees (global, B1/B2 backend, F2 animation, F3 3D, F4 effects budget): `references/decision-trees.md`.
1. Does `senzu/plan/PLAN.md` exist? → follow the `doing` card (or the first `todo`) with `project-planner §references/task-protocol.md`.
2. New project or feature? → `project-planner`.
3. Does it produce UI/styles/a page? → `ui-ux-pro-max` FIRST; then the specialist (animation F2, 3D F3).
4. Animation/scroll? → tree F2 · 3D/WebGL? → tree F3 (validate the cost with F4).
5. Logic/endpoint/tests/security/performance? → `code-quality` (by symptom: tree B2).
6. Module with a rich domain? → tree B1 (simple layers or DDD?).
7. Closing a task or committing? → `devlog`.

## 2. Activation table (read the indicated SKILL.md BEFORE acting)

<!-- BEGIN GENERATED (tools/build-routers.ps1 from core/skills-registry.json; do not edit) -->
| If the task involves… | Skill | Group |
|---|---|---|
| Starting any non-trivial task: decides which skill and section to read (activation table + loading protocol) | `skill-router` **(default: start here)** | Routing |
| Starting a UI, animation or 3D task: detects the front profile and the minimum reading per task; specific effects from the catalog (modern CSS, shapes and SVG, kinetic typography, micro-interactions, advanced WebGL, physics and impact: falling objects, broken screen, intros and loaders) | `front-activation` | Routing |
| Installing or updating the full Senzu in the project (/install): everything, by categories or custom | `instalar-proyecto` | Routing |
| Starting a project or feature, planning, "what do we do now?", next task; and ALWAYS when plan/PLAN.md exists (the plan is followed) | `project-planner` **(default: start here)** | Planning |
| Creating, laying out or redesigning pages, views, layouts, components, forms, dashboards, themes, colors, typography, icons, responsive, accessibility; .vue .tsx .jsx .astro .blade.php .html .css files | `ui-ux-pro-max` **(default: start here)** | Front and design |
| Server state (fetch, cache, invalidation, infinite), tables with sorting/filtering/pagination (client or server), virtualization of large lists; dashboards and data tables (React, Vue, Svelte, Solid) | `tanstack` (if installed) | Front and design |
| Design tokens (primitives → semantic → component), CSS variables, token validation | `design-system` (if installed) | Front and design |
| shadcn/ui components (React or Vue) and Tailwind utilities/theme | `ui-styling` (if installed) | Front and design |
| Generating AI images that match the website: floating product, heros, backgrounds, 3D, mockups, textures (gpt-image in Codex, Nano Banana in Antigravity, multi-provider script) | `image-gen` | Front and design |
| Verifying a finished UI in a real browser: responsive 375/768/1440, dark mode, console and accessibility (axe); mandatory before considering a view done | `ui-verify` | Front and design |
| Modern web design trends and principles | `modern-web-design` (if installed) | Front and design |
| Declarative animation in React/Next with Motion (variants, gestures, layout animations) | `motion-framer` (if installed) | Animation |
| Physics-based animation in React (react-spring) | `react-spring-physics` (if installed) | Animation |
| Prebuilt animated components (Magic UI, React Bits) | `animated-component-libraries` (if installed) | Animation |
| Smooth scroll with Locomotive Scroll | `locomotive-scroll` (if installed) | Animation |
| Page transitions with Barba.js (multi-page sites) | `barba-js` (if installed) | Animation |
| Lottie animations (After Effects JSON) | `lottie-animations` (if installed) | Animation |
| Simple scroll reveals (AOS) on landings | `scroll-reveal-libraries` (if installed) | Animation |
| Lightweight JS animations (anime.js) for DOM/SVG | `animejs` (if installed) | Animation |
| Animation, scroll-driven, parallax, pin/scrub, timelines, page transitions, smooth scroll (Lenis) | `gsap-scrolltrigger` (if installed) | Animation |
| Declarative 3D in React/Next (R3F + drei) | `react-three-fiber` (if installed) | 3D / WebGL |
| 2D graphics/particles on canvas with PixiJS | `pixijs-2d` (if installed) | 3D / WebGL |
| Lightweight decorative 3D effects (Zdog, Vanta, tilt) | `lightweight-3d-effects` (if installed) | 3D / WebGL |
| Exporting/optimizing Blender models to glTF for the web | `blender-web-pipeline` (if installed) | 3D / WebGL |
| Scenes made in Spline and their integration on the web | `spline-interactive` (if installed) | 3D / WebGL |
| PBR texturing with Substance 3D for the web | `substance-3d-texturing` (if installed) | 3D / WebGL |
| Rive interactive animations (state machines) | `rive-interactive` (if installed) | 3D / WebGL |
| Games/experiences with PlayCanvas | `playcanvas-engine` (if installed) | 3D / WebGL |
| Combining Three.js + GSAP + R3F + Motion in complex 3D experiences | `web3d-integration-patterns` (if installed) | 3D / WebGL |
| 3D with Babylon.js (games, complex scenes) | `babylonjs-engine` (if installed) | 3D / WebGL |
| VR/AR in the browser (A-Frame, WebXR) | `aframe-webxr` (if installed) | 3D / WebGL |
| 3D, WebGL/WebGPU, GLB/GLTF models, shaders, particles, configurators, 3D heros | `threejs-webgl` (if installed) | 3D / WebGL |
| HTML presentations | `slides` (if installed) | Graphic design and brand |
| Banners for social media, ads and heros | `banner-design` (if installed) | Graphic design and brand |
| Logos, icons, corporate identity, mockups (AI generation) | `graphic-design` (if installed) | Graphic design and brand |
| Brand voice, visual identity, brand guidelines | `brand` (if installed) | Graphic design and brand |
| Something fails or does not work (red tests, exception, 500 error, wrong result): method to reproduce, failing test, hypothesis, narrow down and fix the cause | `depurar` | Code quality |
| Auditing backend and architecture with evidence (tools per stack, evidence per finding, report), technical debt, legacy code, circular dependencies and safe refactoring with characterization tests | `backend-audit` | Code quality |
| Writing or refactoring logic, creating tests, handling errors/logs, security, performance, designing endpoints/APIs, reviewing or opening a PR | `code-quality` | Code quality |
| Module with rich business rules, several contexts, architecture refactor from MVC, "how do I structure this?" (start with its "is it needed?" checklist) | `ddd-hexagonal` (if installed) | Architecture |
| Reviewing or auditing the project's security, hardening auth / an API / an AI agent, hardening, authorized pentesting, OWASP, prompt injection, XSS/CSRF/SSRF/IDOR, security headers | `security` | Security |
| Laying out or fixing HTML emails (transactional and newsletters): react-email/MJML/framework templates, Gmail/Outlook compatibility, dark mode, plain text and tests before sending | `email-html` | Marketing and SEO |
| Ranking and measuring the website: on-page and local SEO, keywords, Search Console, GA4, Google Tag Manager (container, dataLayer, Consent Mode) and analytics MCPs to operate with agents | `marketing-seo` | Marketing and SEO |
| Deploying and operating any stack in production: Netlify/Vercel/Forge/VPS, Docker, CI/CD with GitHub Actions, per-environment secrets, queues and cron in prod, backups with tested restore, monitoring and incidents | `deploy-ops` | Operations and deployment |
| Finishing a relevant step or committing (always); questions about the project's past (memory and search) | `devlog` | Documentation |
<!-- END GENERATED -->
## 3. Rules that apply without reading anything else
4.5:1 contrast and complete states in UI · `prefers-reduced-motion` · strict typing · validate at the edge · tests of
behavior · authorization on every sensitive action · push only to the working branch, and no destructive operations without approval · devlog before committing.
