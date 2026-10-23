---
name: email-html
description: "HTML emails that look right in Gmail/Outlook/Apple Mail: transactional emails and newsletters with react-email/MJML or the framework's templates, dark mode, plain text and testing before sending. Use it when building or fixing any email."
origen: core/skills/email-html/SKILL.md
huella: 1c5bccd06cca
---

# email-html (Senzu)

Emails are NOT websites: modern CSS dies in Outlook and every client renders differently. This skill
covers BUILDING the template; sending (provider, queues, retries) belongs to `code-quality
§references/integrations.md` and the brand design comes from the project's design system.

## Minimum reading per task
| Task | Read only |
|---|---|
| Build an email (transactional or newsletter) | `references/build-emails.md` |
| "It looks broken in Outlook/Gmail" or testing before sending | `references/compatibility-testing.md` |

## Hard rules
1. **A tool before hand-written HTML**: react-email (TS/React projects), MJML (agnostic), or the
   framework's templates (Laravel Markdown Mail) — they compile to compatible HTML for you. Hand-written tables
   only if the project already does it that way.
2. **600px wide, one column** (or columns that stack on mobile). Simple design: "creative" emails
   are the ones that break.
3. **All styles inline or compiled to inline**; no flex/grid/JS/embedded video/web fonts as the only
   option (system font fallback ALWAYS).
4. **Images**: alt ALWAYS (half the world blocks them), hosted at an absolute https URL, with dimensions;
   the message must be understandable WITHOUT images. Nothing critical inside an image.
5. **One main CTA** as a "bulletproof" button (padding on the cell, not only on the `<a>`), absolute
   links with UTM if it is marketing (measurement: skill `marketing-seo`).
6. **Plain text** always generated (multipart): it improves deliverability and accessibility.
7. **Controlled preheader** (the grey text after the subject): a hidden first line with the summary, or it
   will grab whatever text comes first.
8. Legal: newsletters with a visible unsubscribe link and a physical address (LSSI/CAN-SPAM); transactional emails don't
   carry an unsubscribe link but do state the reason ("You're receiving this because...").
9. **Test before sending** (compatibility reference): render in Gmail+Outlook+iPhone at a minimum,
   dark mode included. "It looks fine in my browser" is not a test.

## Relationship with other skills
- Sending, queues, bounce webhooks → `code-quality` (`integrations.md`, `jobs-and-queues.md`).
- Colors/logo/tone → the project's design system (`BRAND.md`); copy → `ui-ux-pro-max` (`copywriting.md`).
- Campaign measurement (UTM, conversions) → `marketing-seo`.
