# Specification Quality Checklist: Money World

**Purpose**: Validate specification completeness and quality before implementation  
**Created**: 2026-08-26  
**Feature**: [spec.md](../spec.md)

**Review Ownership**: Requirements-quality review. `[x]` means the criterion is satisfied for the spec, not that the app is built.

## Content Quality

- [x] CHK001 Spec Kit mandatory sections are completed (scenarios, requirements, success criteria, assumptions)
- [x] CHK002 Implementation details that coding agents need live in plan.md, data-model.md, and OpenAPI — not only as slogans in the brief
- [x] CHK003 The spec does not claim Money World is already running on `main`
- [x] CHK004 Subjective language (“looks good”, “feels polished”) is not used as acceptance

## Requirement Completeness

- [x] CHK005 No `[NEEDS CLARIFICATION]` markers remain; open items are three numbered approval questions
- [x] CHK006 Every `required` MW-* ID has an observable acceptance condition, surface, and verification method
- [x] CHK007 Success criteria are measurable (seed totals, $100 Food cut, 390px overflow, curl sequence, offline banner)
- [x] CHK008 Edge cases include $0 floor, unbounded +, 422/404, seed-on-read, no silent reallocation
- [x] CHK009 Out of scope is explicit (auth, AI-as-MVP, README rewrite, stale Vercel claim)
- [x] CHK010 Financial formulas, seed table, and rounding rules are normative

## Feature Readiness

- [x] CHK011 User stories US1–US6 cover load, adjust, world, overspend, reset, fallback
- [x] CHK012 Backend is a real, testable part of the system (OpenAPI + pytest tasks)
- [x] CHK013 Frontend-to-backend flow is specified (GET → PATCH → reload → reset)
- [x] CHK014 Brief items were checked against the spec (see Notes)
- [x] CHK015 Constitution conflict is named and routed to an amendment draft, not ignored

## Intentional exceptions

- The Spec Kit template item “no implementation details in spec.md” is **waived**. This documentation phase is an implementation contract for humans, coding agents, and an evaluator. Product behavior stays in spec.md; stack paths stay primarily in plan.md.

## Notes — brief coverage

| Brief item | Where it landed |
|---|---|
| 90-minute mobile-first demo | spec assumptions, tasks phasing |
| Seed JSON | Financial Rules, data-model, OpenAPI example |
| Five districts + mapping table | MW-PROD-003, spec World visual mapping, MW-FE-010 |
| Header / world / controls / reset | US1–US5, MW-FE-005..012 |
| $50 steps | MW-FE-008, Financial Rules |
| remaining = income − sum(categories) | MW-DATA-002 |
| Do not silently move money into savings | MW-DATA / FR-007 |
| Overspend | US4, MW-PROD-006 |
| Pixel / no game engine | MW-FE-018 |
| Client-side option | Replaced by required backend + fallback (US6) |
| Optional AI | US7, MW-PROD-008, OpenAPI `x-optional` |
| Public URL | MW-DEPLOY-007, quickstart caveat |
| 390×844, 44px targets | MW-FE-003, MW-FE-009 |
| Wireframe “30% saved” | Corrected to seed 33% |
