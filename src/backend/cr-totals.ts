import { ChangeRequest, LineItem, PurchaseAgreement } from './cr.types';
import { lineTotal, round2, sumMoney } from './money.util';

function totalOf(items: LineItem[]): number {
	return sumMoney(items.map((li) => lineTotal(li.quantity, li.unitPrice)));
}

export function computeTotals(agreement: PurchaseAgreement, cr: Pick<ChangeRequest, 'draftChanges'>) {
	const baselineTotal = totalOf(agreement.lineItems);
	const proposed = cr.draftChanges?.lineItems?.length ? cr.draftChanges.lineItems : agreement.lineItems;
	const newTotal = totalOf(proposed);
	return { baselineTotal, newTotal, delta: round2(newTotal - baselineTotal) };
}
