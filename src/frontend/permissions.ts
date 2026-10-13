import { ReqUser } from '../backend/cr.types';

export function hasPolicy(user: ReqUser, policy: string): boolean {
	return !!user && user.policies.includes(policy);
}

export function canApprovePolicy(user: ReqUser): boolean {
	return ['cr_a_u', 'cr_a_w', 'cr_a_o'].some((p) => hasPolicy(user, p));
}
