/** Money helpers — 2 decimal places, single currency per agreement. */
export function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineTotal(quantity: number, unitPrice: number): number {
	return round2(quantity * unitPrice);
}

export function sumMoney(amounts: number[]): number {
	return round2(amounts.reduce((acc, n) => acc + n, 0));
}
