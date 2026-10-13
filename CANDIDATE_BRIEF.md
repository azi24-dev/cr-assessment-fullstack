# Fullstack Take-Home: Change Request Approval (service + Angular UI)

Thanks for your time. This exercise mirrors a normal cross-stack slice on our team: a small backend
service and the Angular UI that drives it, joined by an API boundary. We care most about how you keep the
two sides consistent and correct — legal state, permissions on both ends, and graceful UI states across
the seam.

Scope is intentionally trimmed on each side so it fits **~12–18 focused hours across 4 days**. If you run
out of time, **stop and document what's left** — scoping is part of the signal.

## 1. Scenario

Buyers amend live Purchase Agreements via **Change Requests (CRs)** routed for approval. You'll finish the
backend approval actions and the Angular reviewer UI that calls them, so an approver can open a pending
CR, approve or reject it, and see the result — with neither the UI nor the service permitting an action
the user isn't allowed to take.

The UI and the service never talk directly: they meet at a **backend-for-frontend (BFF) seam** — the
provided `CrApiClient`. It stands in for an HTTP layer. Keeping the two sides honest *across that seam* is
the heart of this exercise.

## 2. The provided scaffold

A plain-TypeScript backend over an in-memory repo, an Angular 15 UI (standalone components + templates),
and a `CrApiClient` boundary between them (see `README.md`). Some parts work, some are `TODO`, and a
couple have bugs. Treat the provided tests as a starting point, not the full spec.

## 3. Required tasks

**Task 0 — Orient (no code).** Read the README and skim the backend types + seed. In
`IMPLEMENTATION_NOTES.md`, describe the end-to-end flow in your own words (3–5 sentences).

**Task 1 — Fix the two failing tests at the root.**
- The backend transition guard allows an illegal transition (`src/backend/cr-state-machine.spec.ts`).
- The UI enables Approve for a read-only user (`src/frontend/cr-detail/cr-detail.component.spec.ts`).

Find and fix the underlying cause of each.

**Task 2 — Backend approval actions (`cr-service.ts`).** Implement:
- `approve` — requires an approve policy; legal `PENDING_APPROVAL → APPROVED`; records an approval + audit
  entry.
- `apply` — requires an apply policy; requires `APPROVED`; recomputes totals; consumes budget and rejects
  if the budget can't cover a positive delta; sets `APPLIED` (a terminal state); audits.
- Tighten the transition guard so only legal transitions are allowed and terminal states stay immutable.

**Task 3 — Frontend detail UI (`cr-detail.component` + template).** Implement:
- `canApprove`/`canReject` respecting **both** CR status and the user's permissions, so the action
  buttons hide/disable accordingly,
- `approve`/`reject` driving the **`CrApiClient`**, behaving correctly on a slow or failing response and
  keeping the loaded CR coherent,
- `reject` requires a reason before it can proceed.

**Task 4 — Role-aware UI + states.** A read-only user sees the CR but no enabled actions; loading and
error states are represented explicitly.

**Task 5 — The seam (BFF).** The `CrApiClient` is the only path between UI and service — treat it as your
backend-for-frontend boundary:
- the UI depends only on what the client exposes (it must **not** import the backend service/repo
  directly), and every action travels through the client;
- the client hands the UI what the view needs and translates backend/business errors into a shape the
  template can render, rather than leaking raw backend types or exceptions.

**Task 6 — Tests.** Add tests across the seam: the backend actions (including the budget path), an
illegal-transition rejection, the permission×status action states in the UI, and an approve-through-the-
client end-to-end path. Cover the behavior you built, not just the happy path.

Some edges are left for you to decide (both in the domain and at the seam) — decide, and **note your
assumptions** in `IMPLEMENTATION_NOTES.md`.

## 4. Acceptance criteria

- Both originally-failing tests pass.
- Backend: only legal transitions; terminal states immutable; budget respected and never over-spent;
  every action audited.
- Frontend: action availability respects status **and** permissions; actions go through the API client,
  behave correctly on slow/failing responses, and surface errors gracefully; reject requires a reason.
- The seam holds: the UI never reaches around the client, and an action allowed in the UI succeeds in the
  service while one blocked in the service is never offered by the UI.
- Your added tests meaningfully cover the behavior you built.

## 5. Non-functional requirements

- Keep the existing structure and patterns; match the code style (ESLint + Prettier ship).
- Route all UI→service calls through the provided `CrApiClient`; don't reach around it.
- Meaningful errors via the provided `Errors`/business-error pattern, not bare `throw new Error`.
- Correctness and clarity over cleverness.

## 6. Testing expectations

`npm test` must pass on a clean `npm ci`. Prefer fast, deterministic tests; drive `latencyMs`/`failNext`
on the client. Component tests should assert rendered behavior (disabled buttons, shown errors).

## 7. Documentation — `IMPLEMENTATION_NOTES.md`

A short, honest note (1–2 pages): what you changed, your model of the flow across the seam, the
invariants you keep, your testing strategy, assumptions and judgment calls, where you used AI, and what
you'd improve with more time.

## 8. AI usage policy

Allowed and expected; no penalty. Briefly disclose where you used it, and be ready to explain and
**modify your own code** live in the interview.

## 9. Submission

- A **git repository** with full commit history (please don't squash).
- `IMPLEMENTATION_NOTES.md` at the root.
- A **5–8 minute screen-recording**: demo the end-to-end approve/reject flow and an error state, and walk
  through one decision at the UI↔service seam.
- Ensure `npm ci && npm test` works from a clean clone.

## 10. Suggested 4-day timeline

| Day | Focus |
|---|---|
| 1 | Set up, read, orient. Fix the two failing tests (Task 1). |
| 2 | Backend approve/apply + guard, with the budget path (Task 2). |
| 3 | Frontend detail: permissions + approve/reject via the client + states + the seam (Task 3–5). |
| 4 | Your tests (Task 6), polish, notes, record the video. |

## 11. Follow-up interview

A 45–60 min session on **your** submission: walk us through the flow across the seam; make a **live
change** (e.g. add a "Return to draft" action end-to-end); debug a scenario (e.g. "the audit trail
shows a CR that went from DRAFT straight to APPROVED — where is that prevented?"); discuss one tradeoff.
