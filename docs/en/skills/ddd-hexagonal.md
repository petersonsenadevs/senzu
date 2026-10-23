---
name: ddd-hexagonal
description: "DDD library (strategic/tactical) + hexagonal + light CQRS + integration (outbox, sagas, ACL) for complex projects in Laravel, TypeScript (Next/Node, Vue) and Python: 74 docs by topic, templates and a checklist of when NOT to."
origen: core/skills/ddd-hexagonal/SKILL.md
huella: 41d67fc57902
---

# ddd-hexagonal (Senzu)

Library of 74 short documents (≤ 250 lines, with index) in `references/<tema>/` + code templates in
`templates/<stack>/` + documentation templates in `templates/docs/`. Full catalog: `INDEX.md`.
**Never read the whole library**: decide whether it applies (§1), locate the document in the table (§2) and read only its section.

## 1. Is it needed? (answer before touching code)
Apply DDD + hexagonal if **≥ 3** of these hold:
- [ ] Business rules with real invariants (states, limits, calculations, complex permissions), not just form validation.
- [ ] Several contexts with different language, or external integrations that must be isolated.
- [ ] Expected lifetime > 1 year and/or team > 2 people.
- [ ] Need to test the logic without DB/framework/LLM.
- [ ] It already hurts: 300-line controllers, duplicated logic, Eloquent/Prisma models carrying business rules.

If not: **simple layers** with `code-quality`, and say so explicitly. Reasonable doubt → `references/examples/decision-trees.md`
and `references/examples/crud-vs-ddd-side-by-side.md`. Over-architecture costs as much as its absence.

## 2. Minimum reading per task
| Task | Read only |
|---|---|
| Start a new module/context | `examples/walkthrough-invoicing.md` (full walkthrough) + `stacks/<stack>/overview.md` |
| Delimit contexts, map, language | `strategic/bounded-contexts.md`, `strategic/context-mapping.md`, `strategic/ubiquitous-language.md` |
| Workshop with the business | `strategic/event-storming.md` + `templates/docs/context-sheet.md`, `templates/docs/glossary.md` |
| Modeling: entity, VO, aggregate? | `tactical/entities.md`, `tactical/value-objects.md`, `tactical/aggregates.md` (+ `examples/decision-trees.md`) |
| Repositories, domain services, events | `tactical/repositories.md`, `tactical/domain-services.md`, `tactical/domain-events.md` |
| Rules, invariants, domain errors | `tactical/invariants-and-errors.md`, `tactical/specifications.md` |
| Use case, commands/queries, DTOs, transaction | `application/use-cases.md`, `application/commands-queries-cqrs.md`, `application/dtos-and-mapping.md`, `application/transactions-unit-of-work.md` |
| Authorization and validation by layer | `application/authorization.md`, `application/validation-layers.md` |
| Listings/screens (read models) | `application/read-models-projections.md`, `persistence/read-models-and-projections.md` |
| Ports, adapters, DI, folders | `hexagonal/ports-and-adapters.md`, `hexagonal/dependency-injection.md`, `hexagonal/folder-structures.md` |
| Clean, hexagonal or vertical slices? | `hexagonal/clean-vs-hexagonal-vs-vertical-slices.md` |
| Automated dependency rules | `hexagonal/dependency-rules-tooling.md`, `testing/architecture-tests.md` |
| Persistence with Eloquent / Prisma / SQLAlchemy | `persistence/orm-mapping.md` + `persistence/eloquent-pitfalls.md` \| `prisma-drizzle.md` \| `sqlalchemy.md` |
| Integrations: outbox, queues, sagas, ACL, idempotency | `integration/<tema>.md` (one per topic) |
| Tests per layer | `testing/domain-tests.md`, `use-case-tests.md`, `adapter-tests.md`, `test-data-builders.md` |
| Laravel: providers, HTTP/Inertia, jobs, modules | `stacks/laravel/<tema>.md` + `templates/laravel/` |
| Next/Node/TS | `stacks/typescript/<tema>.md` + `templates/typescript/` |
| FastAPI / LangGraph | `stacks/python/<tema>.md` + `templates/python/` (+ `examples/walkthrough-agent-langgraph.md`) |
| Vue SPA / Inertia (where the domain ends) | `stacks/vue-front/overview.md`, `stacks/vue-front/inertia-and-spa-usecases.md` |
| Modular monolith, microservices? | `strategic/modular-monolith.md`, `strategic/when-microservices.md` |
| Migrate an existing MVC | `checklists/migration-from-mvc.md`, `checklists/smells-and-refactorings.md` |
| Review a design or PR | `checklists/design-review-checklist.md`, `checklists/code-review-checklist.md`, `checklists/anti-patterns.md` |
| Naming things | `checklists/naming-conventions.md` |
| Record a decision | `templates/docs/adr.md` |

## 3. Flow
1. **Context**: name the bounded context and its ubiquitous language (sheet + glossary). One module per context.
2. **Model**: small aggregates with invariants, value objects for everything that has rules, domain events in the past tense.
3. **Ports**: interfaces in domain/application (repositories, gateways, clock, ids, event publisher).
4. **Use cases**: one per action, input command/DTO, one transaction, events after commit.
5. **Adapters**: HTTP/Inertia/CLI/queues (driving) and Eloquent/Prisma/SQLAlchemy/APIs/LLM (driven) outside the domain.
6. **Tests**: pure domain → use cases with fakes → adapters with real integration → thin API → architecture tests.
7. **Dependency rules in CI**: deptrac / dependency-cruiser / import-linter (configs in `templates/`).

## 4. Hard rules
- The domain **does not import the framework or the ORM**. Dependencies always point inward (Infrastructure → Application → Domain).
- One use case = one class/function, one transaction; use cases do not call each other.
- Invariants in the aggregate; side effects via events after commit; one repository per aggregate, with intention-revealing methods.
- Read models for reading; do not hydrate aggregates for listings. Trivial CRUD stays out of this.

## 5. Expected output
Before the code: context + glossary, "applies / does not apply" decision (checklist), chosen structure, use cases and ports.
After: code by layer + domain tests + verification (tests and dependency rules green). Document the decision with `templates/docs/adr.md` and **declare it** in `senzu/arquitectura/capas.json` (`code-quality` → `scripts/arquitectura.mjs --plantilla hexagonal|ddd-hexagonal --stack …`): the arquitectura-guard wall enforces layers and contexts on every change.
Documentation goes to `senzu/arquitectura/` (`adr/`, `contextos/`, `glosario/`, `event-storming/`, `context-map.md`), unless the
project already has its own (`docs/adr`, `docs/architecture`…): then the project's is used.
