import { CrRepo } from './cr-repo';
import { Budget, ChangeRequest, PurchaseAgreement, ReqUser } from './cr.types';
import { CrStatus, CrAction } from './cr.enums';
import { assertTransition } from './cr-state-machine';
import { computeTotals } from './cr-totals';
import { Errors } from './errors';

/**
 * Orchestrates CR actions. `submit`, `sendForApproval`, `reject`, `returnToDraft`, `get`, and `list`
 * are provided. `approve` and `apply` are STUBS for you to implement (see CANDIDATE_BRIEF.md):
 *  - legal transitions only; terminal states immutable,
 *  - apply checks the budget covers a positive delta and updates it,
 *  - every successful action appends an audit entry.
 */
export class CrService {
	constructor(
		private readonly repo: CrRepo,
		private readonly agreements: Map<string, PurchaseAgreement>,
		private readonly budgets: Map<string, Budget>,
	) {}

	private hasAny(u: ReqUser, prefixes: string[]): boolean {
		return prefixes.some((p) => u.policies.includes(p));
	}
	private isUpdater(u: ReqUser) {
		return this.hasAny(u, ['cr_u_u', 'cr_u_w', 'cr_u_o']);
	}
	private isApprover(u: ReqUser) {
		return this.hasAny(u, ['cr_a_u', 'cr_a_w', 'cr_a_o']);
	}
	private isApplier(u: ReqUser) {
		return this.hasAny(u, ['cr_x_u', 'cr_x_w', 'cr_x_o']);
	}

	private getOrThrow(user: ReqUser, id: string): ChangeRequest {
		const cr = this.repo.findOne(user, id);
		if (!cr) throw Errors.notFound(`CR ${id} not found`);
		return cr;
	}

	private transition(cr: ChangeRequest, to: CrStatus, action: CrAction, byUserId: string, at: string, note?: string): void {
		assertTransition(cr.status, to);
		cr.status = to;
		cr.audit = [...cr.audit, { action, byUserId, at, note }];
		cr.version += 1;
	}

	private refreshTotals(cr: ChangeRequest): void {
		const agreement = this.agreements.get(cr.agreementId);
		if (!agreement) throw Errors.notFound('Agreement not found');
		cr.totals = computeTotals(agreement, cr);
	}

	submit(user: ReqUser, id: string, at: string): ChangeRequest {
		const cr = this.getOrThrow(user, id);
		if (!this.isUpdater(user)) throw Errors.forbidden('Cannot submit');
		this.transition(cr, CrStatus.SUBMITTED, CrAction.SUBMIT, user.id, at);
		return this.repo.save(cr);
	}

	sendForApproval(user: ReqUser, id: string, at: string): ChangeRequest {
		const cr = this.getOrThrow(user, id);
		if (!this.isUpdater(user) && !this.isApprover(user)) throw Errors.forbidden('Not allowed');
		if (cr.status === CrStatus.PENDING_APPROVAL) return cr;
		this.refreshTotals(cr);
		this.transition(cr, CrStatus.PENDING_APPROVAL, CrAction.SEND_FOR_APPROVAL, user.id, at);
		return this.repo.save(cr);
	}

	reject(user: ReqUser, id: string, at: string, note?: string): ChangeRequest {
		const cr = this.getOrThrow(user, id);
		if (!this.isApprover(user)) throw Errors.forbidden('Cannot reject');
		if (cr.status === CrStatus.REJECTED) return cr;
		this.transition(cr, CrStatus.REJECTED, CrAction.REJECT, user.id, at, note);
		return this.repo.save(cr);
	}

	returnToDraft(user: ReqUser, id: string, at: string): ChangeRequest {
		const cr = this.getOrThrow(user, id);
		if (!this.isApprover(user)) throw Errors.forbidden('Cannot return');
		this.transition(cr, CrStatus.RETURNED, CrAction.RETURN, user.id, at);
		cr.approvals = [];
		return this.repo.save(cr);
	}

	approve(user: ReqUser, id: string, at: string): ChangeRequest {
		// TODO: require an approve policy; legal transition PENDING_APPROVAL -> APPROVED;
		//       record approval + audit.
		throw Errors.validation('approve not implemented');
	}

	apply(user: ReqUser, id: string, at: string): ChangeRequest {
		// TODO: require an apply policy; require APPROVED; recompute totals; check budget covers a
		//       positive delta else INSUFFICIENT_BUDGET; update budget; set APPLIED; audit.
		throw Errors.validation('apply not implemented');
	}

	get(user: ReqUser, id: string): ChangeRequest {
		return this.getOrThrow(user, id);
	}

	list(user: ReqUser): ChangeRequest[] {
		return this.repo.list(user);
	}
}
