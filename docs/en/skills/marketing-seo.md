---
name: marketing-seo
description: "Website marketing: on-page and local SEO, GA4 + Tag Manager (containers, dataLayer, Consent Mode) and analytics MCPs to operate with agents (official GA4, Search Console, PostHog). Use it to rank and measure; design belongs to ui-ux-pro-max."
origen: core/skills/marketing-seo/SKILL.md
huella: 1a570ffa7b80
---

# marketing-seo (Senzu)

The growth directory: making the website **findable** (SEO), **measured** (GA4/GTM) and
**operable with agents** (analytics MCPs). It works ON an already built website — design belongs to
`ui-ux-pro-max`, the event plan is born in `ui-ux-pro-max §references/es/measurement.md` and the technical
pre-launch pass is `/launch` (`ui-verify §references/launch-checklist.md`): this skill does not duplicate them,
it goes deeper.

## Minimum reading per task
| Task | Read only |
|---|---|
| Ranking: keywords, on-page, local SEO, schema, content | `references/seo-onpage.md` |
| Instrumenting: GA4, Google Tag Manager (container), dataLayer, Consent Mode | `references/analytics-gtm.md` |
| MCPs: reading data with AI, or having the agent CREATE/organize the GTM container | `references/mcp-tools.md` |
| Defining WHAT to measure (conversions per business) | `ui-ux-pro-max §references/es/measurement.md` (the source of the plan) |
| Technical pre-launch checklist (sitemap, OG, robots…) | `ui-verify §references/launch-checklist.md` |
| Multiple languages (hreflang, slugs) | `code-quality §references/i18n.md` |
| Headlines and copy that sells | `ui-ux-pro-max §references/es/copywriting.md` |

## Principles (always apply)
1. **SEO is useful content + correct technique**, in that order: without content that answers the search,
   no technical trick ranks. No keyword stuffing and no unreviewed AI text published in bulk.
2. **Measure what moves the business** (2-5 conversions), behind consent, with no PII. The measurement
   plan rules; GTM is only the vehicle.
3. **A clean GTM container or none**: if there is only GA4 + 2 events, direct `gtag` is enough; GTM comes in
   when there are multiple tags (Ads, pixels, tools) or whoever publishes does not touch code.
4. SEO changes are documented (what was changed and why) and given TIME (weeks, not days) before
   judging them; the source of truth for the result is Search Console + analytics, not intuition.
5. With MCPs: the agent READS data to diagnose, and can CREATE/organize the GTM container (Stape MCP)
   — but NEVER publishes a version without the user's explicit approval; changes to the website follow
   the normal flow (plan → change → verification).

## Relationship with other skills
UI/design → `ui-ux-pro-max` · launch → `ui-verify` (/launch) · languages → `code-quality/i18n` ·
performance (Core Web Vitals) → `code-quality/performance` + launch-checklist §3.
