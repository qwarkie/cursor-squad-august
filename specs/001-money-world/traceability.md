# Requirement-to-test traceability: Money World

Every `required` ID maps to at least one task and one verification method.
`optional` IDs are listed so they cannot be mistaken for MVP gates.

| ID | Class | Task(s) | Verification |
|---|---|---|---|
| MW-PROD-001 | required | T016 | Open `/` — world screen, no wizard |
| MW-PROD-002 | required | T015, T016 | Header text `May 2026`; GET `month` |
| MW-PROD-003 | required | T016, T023, T024 | Five districts / keys only |
| MW-PROD-004 | required | T021, T035 | Demo path tap → PATCH → totals |
| MW-PROD-005 | required | T020, T021 | Impact string after ± |
| MW-PROD-006 | required | T025, T026 | `Overspent` iff remaining < 0 |
| MW-PROD-007 | required | T027, T028, T029 | POST reset + UI Reset |
| MW-PROD-008 | optional | T036 | Absent is a pass for MVP |
| MW-PROD-009 | required | T035 | 60s script in quickstart.md |
| MW-FE-001 | required | (constraint on all FE tasks) | `frontend/package.json` unchanged except none required |
| MW-FE-002 | required | T016 | No router; `/` only |
| MW-FE-003 | required | T032, T034 | 390×844 `scrollWidth <= 390` |
| MW-FE-004 | required | T032, T034 | 1280×800 frame width 390 |
| MW-FE-005 | required | T015 | Header DOM |
| MW-FE-006 | required | T022, T023 | District buttons |
| MW-FE-007 | required | T020 | Selected label + amount |
| MW-FE-008 | required | T020, T021 | ± 50 live PATCH |
| MW-FE-009 | required | T020, T022, T034 | Computed ≥ 44×44 |
| MW-FE-010 | required | T011, T022 | `data-units` |
| MW-FE-011 | required | T026 | `data-overspent` + text |
| MW-FE-012 | required | T029 | Reset control |
| MW-FE-013 | required | T016 | Loading until first settle |
| MW-FE-014 | required | T021, T029 | `role="alert"` |
| MW-FE-015 | required | T030 | Offline banner |
| MW-FE-016 | required | T030 | Empty + Retry |
| MW-FE-017 | required | T022 | Text labels |
| MW-FE-018 | required | T032 | No game-engine dep |
| MW-FE-019 | required | T016, T021, T029 | Network log `/api/budget*` |
| MW-FE-020 | required | T011, T030, T031 | Vitest + offline path |
| MW-FE-021 | required | T016 | ItemForm/List not mounted |
| MW-BE-001 | required | T012, T013 | pytest + curl GET |
| MW-BE-002 | required | T017, T018 | pytest + curl PATCH |
| MW-BE-003 | required | T027, T028 | pytest + curl reset |
| MW-BE-004 | required | existing + T035 | curl health |
| MW-BE-005 | required | T009, T010 | pytest derived totals |
| MW-BE-006 | required | T008, T017 | pytest 422 |
| MW-BE-007 | required | T017, T018 | pytest 404 |
| MW-BE-008 | required | T009, T012 | pytest empty-table GET |
| MW-BE-009 | required | T005 | model file + migration |
| MW-BE-010 | required | T006, T007 | `alembic upgrade head` |
| MW-BE-011 | required | existing config | default SQLite |
| MW-BE-012 | required | T008, OpenAPI | no income write field |
| MW-BE-013 | required | (non-deletion) | `/api/items` still responds |
| MW-BE-014 | required | T008, T017 | `detail` bodies |
| MW-DATA-001 | required | T002, T003, T010, T011 | constants + tests |
| MW-DATA-002 | required | T009, T010, T011 | formula tests |
| MW-DATA-003 | required | T008, T017 | 422 on −1 |
| MW-DATA-004 | required | T008 | integer schema |
| MW-DATA-005 | required | T005, T012 | singleton month |
| MW-DATA-006 | required | T002, T003 | file compare |
| MW-DATA-007 | required | T005, T008 | enum / 404 |
| MW-DEPLOY-001 | required | existing scripts | `npm run dev` |
| MW-DEPLOY-002 | required | T007, T013 | migrate + GET seed |
| MW-DEPLOY-003 | required | T035 | `npm run build` |
| MW-DEPLOY-004 | required | (no vercel rewrite) | review `vercel.json` |
| MW-DEPLOY-005 | required | T035 | quickstart curls |
| MW-DEPLOY-006 | required | T035 | `/api/health` |
| MW-DEPLOY-007 | required | docs-only | this spec / quickstart |
| MW-DEPLOY-008 | required | plan.md | review |
| MW-TEST-001 | required | T010, T012, T017, T027 | pytest happy path |
| MW-TEST-002 | required | T017 | pytest 422/404 |
| MW-TEST-003 | required | T011 | vitest engine |
| MW-TEST-004 | required | T001, T035 | documented commands |
| MW-TEST-005 | required | (docs phase) | README untouched |
| MW-NFR-001 | required | T034 | overflow check |
| MW-NFR-002 | required | T021, T024 | same response paint |
| MW-NFR-003 | required | T035 | local timing |
| MW-NFR-004 | required | OpenAPI | no auth header |
| MW-NFR-005 | required | T001 vs package.json | pytest/httpx dev-only |
| MW-NFR-006 | required | T032 | CSS rule if bitmaps |

## Coverage counts

| Prefix | Required | Optional | Total |
|---|---|---|---|
| MW-PROD | 8 | 1 | 9 |
| MW-FE | 21 | 0 | 21 |
| MW-BE | 14 | 0 | 14 |
| MW-DATA | 7 | 0 | 7 |
| MW-DEPLOY | 8 | 0 | 8 |
| MW-TEST | 5 | 0 | 5 |
| MW-NFR | 6 | 0 | 6 |
| **All** | **69** | **1** | **70** |

FR-001..FR-008 alias MW-PROD-001..003, MW-PROD-004, MW-FE-019, MW-BE-005, MW-DATA (no silent move), MW-PROD-008.

## Unmapped required IDs

None.
