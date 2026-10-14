import { CrService } from './cr-service';
import { CrRepo } from './cr-repo';
import { buildSeed, users } from './seed';
import { CrStatus } from './cr.enums';

const EXTRA_CRS = [
	{ id: 'CR-SUBMITTED',  orgCode: 'org-alpha', agreementId: 'AGR-1', createdBy: 'alice', title: 'Submitted CR',  status: CrStatus.SUBMITTED,  draftChanges: {}, totals: { baselineTotal: 8000, newTotal: 8500, delta: 500 }, approvals: [], version: 1, audit: [] },
	{ id: 'CR-RETURNED',   orgCode: 'org-alpha', agreementId: 'AGR-1', createdBy: 'alice', title: 'Returned CR',   status: CrStatus.RETURNED,   draftChanges: {}, totals: { baselineTotal: 8000, newTotal: 8500, delta: 500 }, approvals: [], version: 2, audit: [] },
	{ id: 'CR-REJECTED',   orgCode: 'org-alpha', agreementId: 'AGR-1', createdBy: 'alice', title: 'Rejected CR',   status: CrStatus.REJECTED,   draftChanges: {}, totals: { baselineTotal: 8000, newTotal: 8500, delta: 500 }, approvals: [], version: 2, audit: [] },
	{ id: 'CR-CANCELLED',  orgCode: 'org-alpha', agreementId: 'AGR-1', createdBy: 'alice', title: 'Cancelled CR',  status: CrStatus.CANCELLED,  draftChanges: {}, totals: { baselineTotal: 8000, newTotal: 8500, delta: 500 }, approvals: [], version: 2, audit: [] },
	{ id: 'CR-APPROVED',   orgCode: 'org-alpha', agreementId: 'AGR-1', createdBy: 'alice', title: 'Approved CR',   status: CrStatus.APPROVED,   draftChanges: {}, totals: { baselineTotal: 8000, newTotal: 8500, delta: 500 }, approvals: [], version: 2, audit: [] },
];

function buildService() {
	const seed = buildSeed();
	const repo = new CrRepo();
	repo.seed([...seed.changeRequests, ...EXTRA_CRS]);
	return new CrService(repo, seed.agreements, seed.budgets);
}

const AT = '2026-04-01T10:00:00.000Z';

describe('CrService.approve', () => {
	it('transitions a PENDING_APPROVAL CR to APPROVED', () => {
		const svc = buildService();
		const cr = svc.approve(users.mona, 'CR-2', AT);
		expect(cr.status).toBe(CrStatus.APPROVED);
	});

	it('records the approval entry', () => {
		const svc = buildService();
		const cr = svc.approve(users.mona, 'CR-2', AT);
		expect(cr.approvals).toEqual(
			expect.arrayContaining([expect.objectContaining({ userId: users.mona.id, at: AT })]),
		);
	});

	it('appends an audit entry', () => {
		const svc = buildService();
		const cr = svc.approve(users.mona, 'CR-2', AT);
		const last = cr.audit[cr.audit.length - 1];
		expect(last.action).toBe('APPROVE');
		expect(last.byUserId).toBe(users.mona.id);
	});

	it('increments the version', () => {
		const svc = buildService();
		const before = svc.get(users.mona, 'CR-2').version;
		const cr = svc.approve(users.mona, 'CR-2', AT);
		expect(cr.version).toBe(before + 1);
	});

	it('throws forbidden for a read-only viewer', () => {
		const svc = buildService();
		expect(() => svc.approve(users.viewer, 'CR-2', AT)).toThrow(/forbidden|cannot approve/i);
	});

	it('throws for an illegal transition from DRAFT', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-1', AT)).toThrow();
	});

	it('throws when the CR is already in a terminal state', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-APPLIED', AT)).toThrow();
	});

	it('throws not-found when a user from another org tries to approve', () => {
		const svc = buildService();
		expect(() => svc.approve(users.bob, 'CR-2', AT)).toThrow(/not found/i);
	});

	// --- additional negative cases ---

	it('throws for a non-existent CR id', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-DOES-NOT-EXIST', AT)).toThrow(/not found/i);
	});

	it('throws forbidden for a user with updater policy but no approve policy', () => {
		const svc = buildService();
		// alice has cr_c_u / cr_r_u / cr_u_u — none of which grant approval
		expect(() => svc.approve(users.alice, 'CR-2', AT)).toThrow(/forbidden|cannot approve/i);
	});

	it('throws when CR is already APPROVED (double-approve)', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-APPROVED', AT)).toThrow();
	});

	it('throws when CR is in REJECTED terminal state', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-REJECTED', AT)).toThrow();
	});

	it('throws when CR is in CANCELLED terminal state', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-CANCELLED', AT)).toThrow();
	});

	it('throws when CR is in SUBMITTED state (approval step not reached yet)', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-SUBMITTED', AT)).toThrow();
	});

	it('throws when CR is in RETURNED state (must go back to draft first)', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-RETURNED', AT)).toThrow();
	});
});
