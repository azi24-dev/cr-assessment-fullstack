import { assertTransition } from './cr-state-machine';
import { CrStatus } from './cr.enums';

/**
 * One case fails on purpose: the transition guard is too permissive. The root cause lives in
 * `assertTransition`.
 */
describe('backend state machine', () => {
	it('allows the legal DRAFT -> SUBMITTED', () => {
		expect(() => assertTransition(CrStatus.DRAFT, CrStatus.SUBMITTED)).not.toThrow();
	});

	it('rejects the illegal DRAFT -> APPROVED (approval cannot be skipped)', () => {
		expect(() => assertTransition(CrStatus.DRAFT, CrStatus.APPROVED)).toThrow(/illegal|not allowed/i);
	});

	it('rejects moving out of a terminal state', () => {
		expect(() => assertTransition(CrStatus.APPLIED, CrStatus.APPROVED)).toThrow();
	});
});
