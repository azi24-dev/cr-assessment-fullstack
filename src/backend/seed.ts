import { Budget, ChangeRequest, PurchaseAgreement, ReqUser } from './cr.types';
import { CrStatus } from './cr.enums';

/** Deterministic, anonymized fixtures (two orgs). */

export const users: Record<string, ReqUser> = {
	alice: { id: 'alice', orgCode: 'org-alpha', policies: ['cr_c_u', 'cr_r_u', 'cr_u_u'] },
	mona: { id: 'mona', orgCode: 'org-alpha', policies: ['cr_r_o', 'cr_a_o', 'cr_x_o'] },
	viewer: { id: 'val', orgCode: 'org-alpha', policies: ['cr_r_o'] },
	bob: { id: 'bob', orgCode: 'org-beta', policies: ['cr_r_o', 'cr_a_o', 'cr_x_o'] },
};

export const agreements: PurchaseAgreement[] = [
	{
		id: 'AGR-1',
		orgCode: 'org-alpha',
		currency: 'USD',
		budgetId: 'BUD-1',
		lineItems: [
			{ sku: 'SKU-A', description: 'Widget A', quantity: 10, unitPrice: 500 },
			{ sku: 'SKU-B', description: 'Widget B', quantity: 30, unitPrice: 100 },
		],
		total: 8000,
	},
	{ id: 'AGR-9', orgCode: 'org-beta', currency: 'USD', budgetId: 'BUD-9', lineItems: [{ sku: 'SKU-Z', description: 'Z', quantity: 5, unitPrice: 200 }], total: 1000 },
];

export const budgets: Budget[] = [
	{ id: 'BUD-1', orgCode: 'org-alpha', currency: 'USD', allocated: 20000, booked: 8000, spent: 2000, balance: 10000 },
	{ id: 'BUD-LOW', orgCode: 'org-alpha', currency: 'USD', allocated: 100, booked: 0, spent: 0, balance: 100 },
	{ id: 'BUD-9', orgCode: 'org-beta', currency: 'USD', allocated: 5000, booked: 1000, spent: 0, balance: 4000 },
];

const proposedPlusOne = [
	{ sku: 'SKU-A', description: 'Widget A', quantity: 11, unitPrice: 500 },
	{ sku: 'SKU-B', description: 'Widget B', quantity: 30, unitPrice: 100 },
];

export const changeRequests: ChangeRequest[] = [
	{ id: 'CR-1', orgCode: 'org-alpha', agreementId: 'AGR-1', createdBy: 'alice', title: 'Add 1 unit of SKU-A', status: CrStatus.DRAFT, draftChanges: { lineItems: proposedPlusOne }, totals: { baselineTotal: 8000, newTotal: 8500, delta: 500 }, approvals: [], version: 1, audit: [] },
	{ id: 'CR-2', orgCode: 'org-alpha', agreementId: 'AGR-1', createdBy: 'alice', title: 'Add 1 unit of SKU-A', status: CrStatus.PENDING_APPROVAL, draftChanges: { lineItems: proposedPlusOne }, totals: { baselineTotal: 8000, newTotal: 8500, delta: 500 }, approvals: [], version: 1, audit: [{ action: 'SUBMIT', byUserId: 'alice', at: '2026-03-01T09:00:00.000Z' }] },
	{ id: 'CR-APPLIED', orgCode: 'org-alpha', agreementId: 'AGR-1', createdBy: 'alice', title: 'Already applied', status: CrStatus.APPLIED, draftChanges: {}, totals: { baselineTotal: 8000, newTotal: 8500, delta: 500 }, approvals: [], version: 3, audit: [] },
	{ id: 'CR-BETA', orgCode: 'org-beta', agreementId: 'AGR-9', createdBy: 'bob', title: 'Beta change', status: CrStatus.PENDING_APPROVAL, draftChanges: {}, totals: { baselineTotal: 1000, newTotal: 1200, delta: 200 }, approvals: [], version: 1, audit: [] },
];

export function buildSeed() {
	return {
		users,
		agreements: new Map(agreements.map((a) => [a.id, a])),
		budgets: new Map(budgets.map((b) => [b.id, b])),
		changeRequests,
	};
}
