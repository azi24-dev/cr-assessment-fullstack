# Implementation Notes

## 1. What I changed

**Backend**

- The transition guard in `assertTransition` was only blocking moves out of terminal states, which meant illegal jumps like DRAFT straight to APPROVED were silently allowed. I added a check against the declared legal transitions map so anything not explicitly listed is rejected.
- Implemented `approve` in the service. It verifies the user holds an approve policy, runs the state transition, and records both the approval sign-off and an audit entry.
- Implemented `apply`. It checks the apply policy, recomputes the CR totals fresh from the agreement at apply time, and guards against overspending the budget before committing the transition and updating the budget balance.

**Frontend**

- The `canApprove` and `canReject` getters were only looking at CR status, ignoring whether the user actually had permission. Fixed both to check the user's policies alongside the status, and added `canApply` on the same pattern for the APPROVED to APPLIED step.
- Filled in the `approve`, `reject`, and `apply` methods on the detail component. Each one sets a submitting flag while in flight, clears it in a finally block, shows any error in the action error area, and reloads the CR on success so the view reflects the new state.
- Added `ngOnChanges` to the detail component so that clicking a different row actually reloads the detail. Previously the component only fetched on first init and ignored later id changes.
- Added an Apply button to the template, shown only when `canApply` is true, and wired `apply` through `CrApiClient` so the backend is always reached through the seam.
- Fixed the app shell to clear the selected CR when switching users, and to refresh the list after any action so the status column stays in sync with the detail.

## 2. Model of the flow (UI to client to service)

- When the user clicks Approve, the buttons are immediately disabled so the same action cannot be fired twice. The request goes to the API client, which simulates network latency before calling the backend service.

- The service checks that the user has permission, that the transition is legal, then updates the CR status, records the approval, and saves it.

- Once the call comes back, the component fetches the updated CR and re-renders the view with the new status and timeline. The list is also notified so the status column stays in sync.

- If anything goes wrong at any point (wrong permission, illegal transition, or a network failure) the error is caught and shown to the user above the action buttons. The buttons are re-enabled regardless of outcome.

## 3. Invariants I keep

| Invariant | How / where |
|---|---|
| Only legal state transitions happen | The backend validates every move against a declared map of allowed transitions before applying it |
| Terminal states can never change | A terminal state check runs before anything else. Once a CR is applied, rejected, or cancelled it cannot move |
| Budget is never overspent | The apply action checks that the remaining budget balance covers the delta before touching the budget |
| A user can only act on CRs in their own org | The data layer filters every lookup by org. A user from another org simply gets a not-found response |
| The UI never offers an action the service would reject | Permission and status are checked in the component before showing or enabling any action button |
| Actions cannot be double-fired | While a request is in flight all action buttons are disabled until the response comes back |
| Every state change is audited | Every successful transition appends a record to the audit trail. There is no path that changes status without logging it |

## 4. Testing strategy

Backend tests cover the success path, permission failures, illegal transitions, and budget edge cases: zero delta (no budget check), negative delta (cost reduction, no deduction), exact balance (should pass), and one unit over (should fail). Terminal state immutability is verified for every terminal status, and cross-org access is confirmed to return not-found rather than forbidden. A fresh repo is built per test so nothing leaks between cases.

Frontend tests mount the real component against the real client and service with no mocks, so a button click in the test goes all the way through the stack. This catches mismatches across the seam that unit tests would miss. Error paths are exercised using `failNext` on the client, which lets the test assert that the error message appears in the DOM without caring which specific error was thrown.

Skipped: the list component and end-to-end browser tests. The in-memory integration harness already covers the full stack at the component level, so a separate E2E layer would test the same paths at higher cost.

## 5. Assumptions

- Action timestamps use the client's local time. The requirements did not specify a server clock, and using the client timezone is the natural choice since the user performing the action is the one whose time matters for the audit trail.
- Budget is only checked when the CR adds cost. A CR that reduces or keeps spend the same should never be blocked by the budget, so the check is skipped for zero or negative deltas.
- Reject and apply share the same policy (`cr_x_o`) because the requirements grouped both under the executor role. There was no separate policy string for reject in the spec.

## 6. Where I used AI

I used AI as a tool, not a driver. All design decisions, invariants, and debugging were mine. I used it mainly for repetitive tasks like writing boilerplate test cases once the pattern was established, and for drafting these notes. Where I was unsure about something, like the Angular ngOnChanges behaviour, I used it to build understanding quickly, then wrote or reviewed the actual code myself. I don't believe in generating code I can't explain, so everything here I can walk through line by line.

## 7. What I'd improve with more time

- Add optimistic UI updates so the status column reflects the new state immediately rather than after the reload round-trip.
- Replace `setTimeout` latency simulation in `CrApiClient` with a proper interceptor pattern so latency and failure injection can be controlled per-test without mutating shared state.
- Add list-level component tests that verify the status column updates after an action completes, rather than relying on manual verification of the `@Output changed` wiring.
- The budget check reads the agreement and budget on every apply call. In a real system these would be fetched once and cached; the current approach is fine for an in-memory store but would be a performance problem over a network.
- Give `reject` its own policy string rather than sharing `cr_x_o` with apply. The two actions have different risk profiles and the policy granularity should reflect that.
