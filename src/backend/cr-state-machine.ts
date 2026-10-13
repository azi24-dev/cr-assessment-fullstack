import { CrStatus, isTerminal } from './cr.enums';
import { Errors } from './errors';

/** Legal transitions for the CR state machine. */
export const LEGAL_TRANSITIONS: Partial<Record<CrStatus, CrStatus[]>> = {
	[CrStatus.DRAFT]: [CrStatus.SUBMITTED, CrStatus.CANCELLED],
	[CrStatus.SUBMITTED]: [CrStatus.PENDING_APPROVAL, CrStatus.CANCELLED],
	[CrStatus.PENDING_APPROVAL]: [CrStatus.APPROVED, CrStatus.RETURNED, CrStatus.REJECTED],
	[CrStatus.APPROVED]: [CrStatus.APPLIED],
	[CrStatus.RETURNED]: [CrStatus.DRAFT],
};

export function canTransition(from: CrStatus, to: CrStatus): boolean {
	return (LEGAL_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Throw a BusinessError if the transition from->to is not allowed.
 *
 * Heads-up: this currently only rejects moves out of terminal states — it lets any other
 * transition through (e.g. DRAFT -> APPROVED, skipping approval). `cr-state-machine.spec.ts`
 * surfaces the defect; the root cause lives here.
 */
export function assertTransition(from: CrStatus, to: CrStatus): void {
	if (isTerminal(from)) {
		throw Errors.terminal(`Cannot move a ${from} change request to ${to}`);
	}
	// TODO: also reject transitions that are not declared legal above (use canTransition).
	return;
}
