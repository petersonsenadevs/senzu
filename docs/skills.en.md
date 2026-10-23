<!-- GENERADO por tools/build-docs.ps1 desde core/skills-registry.json, core/commands/, core/hooks/ y stacks/. NO editar a mano. -->

# Skills and routing

[← Back to README](../README.md)

Which skills exist, when each one kicks in and on which signals. Third-party ones are vendored with Senzu's own layer on top (see [architecture](arquitectura.en.md)).

The agent decides on its own, in three automatic layers:
1. **When the session starts** (SessionStart hook): project state (stack, versions+EOL, whether it is new or
   existing, design system, plan, devlog, conventions) + entry points: UI → `ui-ux-pro-max` ·
   logic → `code-quality` · new project → `project-planner` · in doubt → `skill-router`.
2. **On every request** (UserPromptSubmit hook): the *signals* in the tables below suggest the skill
   (max. 2, once per skill and session), in English or Spanish. *Entrypoints* go first; on an equal match the higher priority wins.
3. **Activation tables** (`skill-router` and `front-activation`, generated from the registry): the agent
   checks them when in doubt; `references/decision-trees.md` has the full decision trees.

Total: **45 skills**. Single source: `core/skills-registry.json` (group, when, signals, priority, dependencies).
The skills themselves are written for the agent, which answers in your language: only this catalog is translated.

### Planning (group `planning`, 1 skill)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| **`project-planner`** (entry) | 20 | Starting a project or feature, planning, "what do we do now?", next task; and ALWAYS when plan/PLAN.md exists (the plan is followed) | …next task, let's start, new project, scope, budget, estimate, how many hours, how much does it cost |

### Routing (group `routing`, 3 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| **`skill-router`** (entry) | 0 | Starting any non-trivial task: decides which skill and section to read (activation table + loading protocol) | que stack, elegir stack, con que lo hago, que skill, which stack, choose a stack, what do I use, which skill |
| `front-activation` | 8 | Starting a UI, animation or 3D task: detects the front-end profile and the minimum reading per task; specific effects from the catalog (modern CSS, shapes and SVG, kinetic typography, microinteractions, advanced WebGL, physics and impact: falling objects, broken screen, intros and loaders) | …matter js, loader que se rompe, full.screen menu, animated hamburger, breaks the screen, falling object, logo falls, broken screen |
| `instalar-proyecto` | 8 | Installing or updating the full Senzu in the project (/install): everything, by category or custom | …actualizar dev.standards, reinstala dev.standards, instalar el paquete, instalacion de dev.standards, install dev.standards, update senzu, reinstall senzu, install the package |

### Code quality (group `quality`, 3 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `backend-audit` | 8 | Auditing backend and architecture with proof (tools per stack, evidence per finding, report), technical debt, legacy code, circular dependencies and safe refactoring with characterization tests | …tests de arquitectura, technical debt, legacy code, circular dependencies, code smells, safe refactor, characterization tests, audit the backend |
| `depurar` | 8 | Something fails or does not work (failing tests, exception, 500 error, wrong result): method to reproduce, write a failing test, form hypotheses, narrow it down and fix the root cause | …tests en rojo, no pasan el tests, doesn't work, not working, crashes, hangs, throws an error, tests are red |
| `code-quality` | 5 | Writing or refactoring logic, writing tests, handling errors/logs, security, performance, designing endpoints/APIs, reviewing or opening a PR | …subscription, time zone, translation, file uploads, project map, explain the project, where is the code, how is the project built |

### Architecture (group `architecture`, 1 skill)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `ddd-hexagonal` | 5 | Module with rich business rules, several contexts, architecture refactor away from MVC, "how do I structure this?" (start with its "do I need it?" checklist) | …repository, cqrs, event storming, modulo nuevo, modular, how do I structure, new module, rich domain |

### Documentation (group `docs`, 1 skill)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `devlog` | 8 | Finishing a relevant step or committing (always); questions about the project's past (memory and search) | …when did we change, what did we decide, where did we leave off, where were we, remember this, save this to memory, project memory, user memory |

### Front end and design (group `front`, 7 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| **`ui-ux-pro-max`** (entry) | 15 | Creating, laying out or redesigning pages, views, layouts, components, forms, dashboards, themes, colors, typography, icons, responsive design, accessibility; .vue .tsx .jsx .astro .blade.php .html .css files | …page, component, form, style, theme, redesign, improve the page, new round |
| `design-system` | 10 | Design tokens (primitive → semantic → component), CSS variables, token validation | design tokens, tokens de diseño, tokens semanticos, primitivos, css variables, sistema de diseño |
| `tanstack` | 10 | Server state (fetching, caching, invalidation, infinite queries), tables with sorting/filtering/pagination (client or server side), virtualization of large lists; dashboards and data tables (React, Vue, Svelte, Solid) | …useQuery, estado del servidor, server.state, tabla de datos, data.grid, grid de datos, virtualiza de listas, paginacion en servidor |
| `ui-styling` | 10 | shadcn/ui components (React or Vue) and Tailwind utilities/theme | shadcn-vue, radix, reka, componentes de ui, tailwind config, cva |
| `image-gen` | 8 | Generating AI images that match the website: floating product, heroes, backgrounds, 3D, mockups, textures (gpt-image in Codex, Nano Banana in Antigravity, multi-provider script) | …ideogram, render 3d de producto, mockup del producto, generate an image, ai[- ]generated image, product photo, background image, 3d product render |
| `ui-verify` | 8 | Verifying a finished UI in a real browser: responsive 375/768/1440, dark mode, console and accessibility (axe); required before a view is considered done | …navegacion por teclado, verify, check the ui, launch the web, going to production, publish the web, launch checklist, keyboard navigation |
| `modern-web-design` | 5 | Modern web design trends and principles | tendencias, bento, glassmorphism, neo-brutalis, estilo moderno, inspiracion, awwwards |

### Animation (group `motion`, 9 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `motion-framer` | 10 | Declarative animation in React/Next with Motion (variants, gestures, layout animations) | framer motion, motion/react, animatepresence, variants, layout animation, usescroll, usetransform |
| `animated-component-libraries` | 8 | Ready-made animated components (Magic UI, React Bits) | …marquee react, shimmer, border beam, bento grid, blur text, count up react, dock, blob cursor |
| `animejs` | 8 | Lightweight JS animations (anime.js) for DOM/SVG | anime js, anime |
| `barba-js` | 8 | Page transitions with Barba.js (multi-page sites) | barba js, mpa, crossfade, wipe entre paginas, multipagina |
| `locomotive-scroll` | 8 | Smooth scroll with Locomotive Scroll | locomotive |
| `lottie-animations` | 8 | Lottie animations (After Effects JSON) | lottie, after effects, bodymovin, dotlottie |
| `react-spring-physics` | 8 | Physics-based animation in React (react-spring) | react-spring, popmotion, animacion fisica, spring physics |
| `scroll-reveal-libraries` | 8 | Simple scroll reveals (AOS) on landing pages | aos, animate on scroll, reveal simple, fade in al hacer scroll |
| `gsap-scrolltrigger` | 5 | Animation, scroll-driven effects, parallax, pin/scrub, timelines, page transitions, smooth scroll (Lenis) | …video scrubbing, countup, count up, progress de lectura, scrollspy, snap, page transition, wipe |

### 3D / WebGL (group `3d`, 12 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `pixijs-2d` | 10 | 2D graphics/particles on canvas with PixiJS | …sprites, displacement, filtro 2d, pixelate, chromatic aberration, glow, liquid, distorsion 2d |
| `react-three-fiber` | 10 | Declarative 3D in React/Next (R3F + drei) | r3f, react three fiber, drei, fiber |
| `lightweight-3d-effects` | 8 | Lightweight decorative 3D effects (Zdog, Vanta, tilt) | …glare, waves, globe, birds, fog, vanilla-tilt, mouse parallax, parallax del raton |
| `aframe-webxr` | 5 | VR/AR in the browser (A-Frame, WebXR) | a-frame, webxr, realidad virtual |
| `babylonjs-engine` | 5 | 3D with Babylon.js (games, complex scenes) | babylon js |
| `blender-web-pipeline` | 5 | Exporting/optimizing Blender models to glTF for the web | blender, exportar gltf, draco, ktx2 |
| `playcanvas-engine` | 5 | Games/experiences with PlayCanvas | playcanvas |
| `rive-interactive` | 5 | Interactive Rive animations (state machines) | rive, state machine de animacion |
| `spline-interactive` | 5 | Scenes built in Spline and their integration into the web | spline |
| `substance-3d-texturing` | 5 | PBR texturing with Substance 3D for the web | substance, texturiz, pbr |
| `threejs-webgl` | 5 | 3D, WebGL/WebGPU, GLB/GLTF models, shaders, particles, configurators, 3D heroes | …distorsion, displacement, hover distortion, uniforms, glsl, noise, blob, fondo animado 3d |
| `web3d-integration-patterns` | 5 | Combining Three.js + GSAP + R3F + Motion in complex 3D experiences | integrar 3d, 3d gsap, three motion, experiencia 3d compleja |

### Graphic design and branding (group `design`, 4 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `banner-design` | 5 | Banners for social media, ads and heroes | banners, creatividades, anuncios, ads |
| `brand` | 5 | Brand voice, visual identity, brand guidelines | marca, branding, voz de marca, guia de marca, brand |
| `graphic-design` | 5 | Logos, icons, corporate identity, mockups (AI generation) | logo, logotipo, iconos, identidad corporativa, mockups, cip |
| `slides` | 5 | HTML presentations | presentacion, slides, diapositivas, deck |

### Marketing and SEO (group `growth`, 2 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `email-html` | 8 | Building or fixing HTML emails (transactional and newsletters): react-email/MJML/framework templates, Gmail/Outlook compatibility, dark mode, plain text and testing before sending | …email html, maqueta el email, se ve roto en outlook, mailable, transactional email, welcome email, email template, broken in outlook |
| `marketing-seo` | 8 | Ranking and measuring the website: on-page and local SEO, keywords, Search Console, GA4, Google Tag Manager (container, dataLayer, Consent Mode) and analytics MCPs for agents to operate | …meta ads, posthog, matomo, informe de visitas, positioning, rank on google, traffic report, tracking pixel |

### Operations and deployment (group `ops`, 1 skill)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `deploy-ops` | 8 | Deploying and running any stack in production: Netlify/Vercel/Forge/VPS, Docker, CI/CD with GitHub Actions, per-environment secrets, queues and cron in prod, backups with tested restores, monitoring and incidents | …traspaso al cliente, servicios y accesos, push to production, the web is down, deliver to the client, handoff, user manual, rollback |

### Security (group `security`, 1 skill)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `security` | 8 | Reviewing or auditing the project's security, hardening auth / an API / an AI agent, hardening, authorized pentesting, OWASP, prompt injection, XSS/CSRF/SSRF/IDOR, security headers | …cabeceras de seguridad, security headers, secure the, hardening, es seguro, is it secure, agente de ia seguro, seguridad del agente |
