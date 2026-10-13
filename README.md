# Change Request Approval — Fullstack Exercise (service + Angular UI)

A compact fullstack exercise for a procurement platform. You'll complete a small slice end to end: a
backend **Change Request (CR)** approval service and the **Angular UI** that drives it through an
in-process API client.

The scope is deliberately smaller on each side than a backend-only or frontend-only take-home — the goal
is to see you work correctly across the seam between UI and service. Start with
[`CANDIDATE_BRIEF.md`](./CANDIDATE_BRIEF.md).

## Stack & setup

Plain-TypeScript backend (service over an in-memory repo) + **Angular 15** UI (standalone components,
external `.html` templates). The `CrApiClient` in `src/integration/` is the UI↔service boundary (it
stands in for an HTTP layer — no server or DB). It's a real, runnable app: `npm start` serves the whole
stack in the browser (the in-process client calls the in-memory backend directly).

```bash
nvm use            # Node 18.20.3
npm ci             # uses .npmrc (legacy-peer-deps) — please keep it
npm start          # ng serve -> http://localhost:4200  (run the UI to click through / record your demo)
npm test           # Jest — two tests fail on purpose; fixing them is task 1
npm run build      # ng build (production)
npm run lint
npm run format
```

### Running the UI

`npm start` boots a demo shell (`src/app/`) hosting the list + detail screens, wired through the
`CrApiClient` to the in-process backend. Use the **"Acting as"** switcher to change the current user
(e.g. `mona` approver, `viewer` read-only, `bob` other-org) to demo permission gating and the cross-org
case in your walkthrough video.

## Policy-string convention

Permission strings are shaped **`cr_{action}_{scope}`** — e.g. `cr_a_o` = approve any CR in the org,
`cr_x_o` = apply, `cr_r_o` = read-only. The UI and the service must each only allow actions the user is
permitted to take.

## State machine (backend)

`DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → APPLIED`, with `REJECTED` / `CANCELLED` / `RETURNED`
off-ramps. Terminal states (`APPLIED`, `REJECTED`, `CANCELLED`) are immutable.

## Where to work

**Backend (`src/backend/`)**
- `cr-state-machine.ts` — the transition guard is too permissive; tighten it.
- `cr-service.ts` — implement `approve` and `apply` (legal transitions, budget handling on apply, audit).
  `submit`/`sendForApproval`/`reject`/`get`/`list` are provided.

**Frontend (`src/frontend/`)**
- `cr-detail/cr-detail.component.{ts,html}` — make `canApprove`/`canReject` respect **both** status and
  permission (so the buttons hide/disable correctly), and implement `approve`/`reject` to drive the
  `CrApiClient` (behaving correctly on slow/failing responses, and requiring a reason to reject).
  `cr-list` is provided as the working pattern.

**Integration (`src/integration/cr-api-client.ts`)** is the backend-for-frontend (BFF) seam — the only
path between the UI and the service. Your UI must go through it (never import the backend service/repo
directly); it's also where the UI-facing shape and error translation live.

The visible tests are a starting point, not the full specification.

## Testing

Backend tests are plain Jest (see `src/test-helpers.ts` `buildApp`). Component tests use `TestBed` and
assert on rendered DOM; the API client resolves on a timer, so component tests are real `async` (render →
let it settle → assert). Copy the pattern from the provided `*.spec.ts` files.

## Files

```
src/
  backend/      cr.enums, cr.types, money.util, errors, cr-totals, cr-state-machine, cr-repo, cr-service, seed
  integration/  cr-api-client.ts          # UI <-> service boundary (provided, Angular service)
  session/      session.service.ts        # current user
  frontend/     view-state, permissions, cr-list/*, cr-detail/*  (Angular components + templates)
  test-helpers.ts
  backend/cr-state-machine.spec.ts                 # one failing case to start from
  frontend/cr-detail/cr-detail.component.spec.ts   # one failing case to start from
  smoke.spec.ts                                    # passing integration example
```

## A note on AI tools

Allowed and expected — see the brief. The follow-up interview is built around your own code.
