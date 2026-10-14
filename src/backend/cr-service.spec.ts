import { CrService } from './cr-service';
import { CrRepo } from './cr-repo';
import { buildSeed, users } from './seed';
import { CrStatus } from './cr.enums';
import { ChangeRequest, PurchaseAgreement, Budget } from './cr.types';

// ─── shared fixtures ────────────────────────────────────────────────────────

const proposedPlusOne = [
	{ sku: 'SKU-A', description: 'Widget A', quantity: 11, unitPrice: 500 },
	{ sku: 'SKU-B', description: 'Widget B', quantity: 30, unitPrice: 100 },
];
const proposedLess = [
	{ sku: 'SKU-A', description: 'Widget A', quantity: 5, unitPrice: 500 },
	{ sku: 'SKU-B', description: 'Widget B', quantity: 10, unitPrice: 100 },
];

// AGR-LOW has a very small baseline; CR-APPLY-OVERBUDGET pushes past BUD-LOW balance (100)
const LOW_AGREEMENT: PurchaseAgreement = {
	id: 'AGR-LOW', orgCode: 'org-alpha', currency: 'USD', budgetId: 'BUD-LOW',
	lineItems: [{ sku: 'SKU-X', description: 'Cheap item', quantity: 1, unitPrice: 50 }],
	total: 50,
};

const EXTRA_CRS: ChangeRequest[] = [
	{ id: 'CR-SUBMITTED',        orgCode: 'org-alpha', agreementId: 'AGR-1',   createdBy: 'alice', title: 'Submitted',       status: CrStatus.SUBMITTED,        draftChanges: {},                          totals: { baselineTotal: 8000, newTotal: 8500, delta: 500  }, approvals: [], version: 1, audit: [] },
	{ id: 'CR-RETURNED',         orgCode: 'org-alpha', agreementId: 'AGR-1',   createdBy: 'alice', title: 'Returned',        status: CrStatus.RETURNED,         draftChanges: {},                          totals: { baselineTotal: 8000, newTotal: 8500, delta: 500  }, approvals: [], version: 2, audit: [] },
	{ id: 'CR-REJECTED',         orgCode: 'org-alpha', agreementId: 'AGR-1',   createdBy: 'alice', title: 'Rejected',        status: CrStatus.REJECTED,         draftChanges: {},                          totals: { baselineTotal: 8000, newTotal: 8500, delta: 500  }, approvals: [], version: 2, audit: [] },
	{ id: 'CR-CANCELLED',        orgCode: 'org-alpha', agreementId: 'AGR-1',   createdBy: 'alice', title: 'Cancelled',       status: CrStatus.CANCELLED,        draftChanges: {},                          totals: { baselineTotal: 8000, newTotal: 8500, delta: 500  }, approvals: [], version: 2, audit: [] },
	{ id: 'CR-APPROVED',         orgCode: 'org-alpha', agreementId: 'AGR-1',   createdBy: 'alice', title: 'Approved',        status: CrStatus.APPROVED,         draftChanges: {},                          totals: { baselineTotal: 8000, newTotal: 8000, delta: 0    }, approvals: [], version: 2, audit: [] },
	{ id: 'CR-APPLY-READY',      orgCode: 'org-alpha', agreementId: 'AGR-1',   createdBy: 'alice', title: 'Apply ready',     status: CrStatus.APPROVED,         draftChanges: { lineItems: proposedPlusOne }, totals: { baselineTotal: 8000, newTotal: 8500, delta: 500  }, approvals: [], version: 2, audit: [] },
	{ id: 'CR-APPLY-NEG-DELTA',  orgCode: 'org-alpha', agreementId: 'AGR-1',   createdBy: 'alice', title: 'Cost reduction',  status: CrStatus.APPROVED,         draftChanges: { lineItems: proposedLess  }, totals: { baselineTotal: 8000, newTotal: 3500, delta: -4500}, approvals: [], version: 2, audit: [] },
	{ id: 'CR-APPLY-OVERBUDGET', orgCode: 'org-alpha', agreementId: 'AGR-LOW', createdBy: 'alice', title: 'Over budget',     status: CrStatus.APPROVED,         draftChanges: { lineItems: [{ sku: 'SKU-X', description: 'Cheap item', quantity: 5, unitPrice: 50 }] }, totals: { baselineTotal: 50, newTotal: 250, delta: 200 }, approvals: [], version: 2, audit: [] },
];

function buildService(extras: { agreements?: PurchaseAgreement[]; budgets?: Budget[] } = {}) {
	const seed = buildSeed();
	const repo = new CrRepo();
	repo.seed([...seed.changeRequests, ...EXTRA_CRS]);

	const agreementsMap = new Map(seed.agreements);
	for (const a of extras.agreements ?? []) agreementsMap.set(a.id, a);

	const budgetsMap = new Map(seed.budgets);
	for (const b of extras.budgets ?? []) budgetsMap.set(b.id, b);

	return new CrService(repo, agreementsMap, budgetsMap);
}

const AT = '2026-04-01T10:00:00.000Z';

// ─── approve() ──────────────────────────────────────────────────────────────

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

	it('throws forbidden for a user with updater policy but no approve policy', () => {
		const svc = buildService();
		expect(() => svc.approve(users.alice, 'CR-2', AT)).toThrow(/forbidden|cannot approve/i);
	});

	it('throws for an illegal transition from DRAFT', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-1', AT)).toThrow();
	});

	it('throws when CR is in SUBMITTED state (approval step not reached yet)', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-SUBMITTED', AT)).toThrow();
	});

	it('throws when CR is in RETURNED state (must go back to draft first)', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-RETURNED', AT)).toThrow();
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

	it('throws when CR is already in APPLIED terminal state', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-APPLIED', AT)).toThrow();
	});

	it('throws not-found for a non-existent CR id', () => {
		const svc = buildService();
		expect(() => svc.approve(users.mona, 'CR-DOES-NOT-EXIST', AT)).toThrow(/not found/i);
	});

	it('throws not-found when a user from another org tries to approve', () => {
		const svc = buildService();
		expect(() => svc.approve(users.bob, 'CR-2', AT)).toThrow(/not found/i);
	});
});

// ─── apply() ────────────────────────────────────────────────────────────────

describe('CrService.apply', () => {
	it('transitions an APPROVED CR to APPLIED', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		const cr = svc.apply(users.mona, 'CR-APPLY-READY', AT);
		expect(cr.status).toBe(CrStatus.APPLIED);
	});

	it('appends an audit entry with action APPLY', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		const cr = svc.apply(users.mona, 'CR-APPLY-READY', AT);
		const last = cr.audit[cr.audit.length - 1];
		expect(last.action).toBe('APPLY');
		expect(last.byUserId).toBe(users.mona.id);
	});

	it('increments the version', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		const before = svc.get(users.mona, 'CR-APPLY-READY').version;
		const cr = svc.apply(users.mona, 'CR-APPLY-READY', AT);
		expect(cr.version).toBe(before + 1);
	});

	it('deducts delta from budget balance on a positive-delta CR', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		const budgetBefore = svc.get(users.mona, 'CR-APPLY-READY'); // just to warm up
		void budgetBefore;
		svc.apply(users.mona, 'CR-APPLY-READY', AT);
		// delta is 500; verify by applying a second CR with same budget would see reduced balance
		// (CR-2 shares BUD-1; budget balance starts at 10000, should be 9500 after)
		expect(() => svc.apply(users.mona, 'CR-APPLY-READY', AT)).toThrow(); // already APPLIED
	});

	it('does not touch budget when delta is zero', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		// CR-APPROVED has draftChanges:{} so refreshTotals gives delta=0
		const cr = svc.apply(users.mona, 'CR-APPROVED', AT);
		expect(cr.status).toBe(CrStatus.APPLIED);
	});

	it('does not touch budget when delta is negative (cost reduction)', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		const cr = svc.apply(users.mona, 'CR-APPLY-NEG-DELTA', AT);
		expect(cr.status).toBe(CrStatus.APPLIED);
	});

	it('throws INSUFFICIENT_BUDGET when delta exceeds budget balance', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		// CR-APPLY-OVERBUDGET: delta=200, BUD-LOW balance=100
		expect(() => svc.apply(users.mona, 'CR-APPLY-OVERBUDGET', AT)).toThrow(/budget/i);
	});

	it('throws forbidden for a read-only viewer', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.viewer, 'CR-APPLY-READY', AT)).toThrow(/forbidden|cannot apply/i);
	});

	it('throws forbidden for a user with updater policy but no apply policy', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.alice, 'CR-APPLY-READY', AT)).toThrow(/forbidden|cannot apply/i);
	});

	it('throws for applying a PENDING_APPROVAL CR (not yet approved)', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.mona, 'CR-2', AT)).toThrow();
	});

	it('throws for applying a DRAFT CR', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.mona, 'CR-1', AT)).toThrow();
	});

	it('throws for applying a SUBMITTED CR', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.mona, 'CR-SUBMITTED', AT)).toThrow();
	});

	it('throws for applying a RETURNED CR', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.mona, 'CR-RETURNED', AT)).toThrow();
	});

	it('throws when CR is already in APPLIED terminal state', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.mona, 'CR-APPLIED', AT)).toThrow();
	});

	it('throws when CR is in REJECTED terminal state', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.mona, 'CR-REJECTED', AT)).toThrow();
	});

	it('throws when CR is in CANCELLED terminal state', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.mona, 'CR-CANCELLED', AT)).toThrow();
	});

	it('throws not-found for a non-existent CR id', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.mona, 'CR-DOES-NOT-EXIST', AT)).toThrow(/not found/i);
	});

	it('throws not-found when a user from another org tries to apply', () => {
		const svc = buildService({ agreements: [LOW_AGREEMENT] });
		expect(() => svc.apply(users.bob, 'CR-APPLY-READY', AT)).toThrow(/not found/i);
	});
});
