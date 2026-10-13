import { CrStatus } from './cr.enums';

export interface ReqUser {
	id: string;
	orgCode: string;
	policies: string[]; // 'cr_{action}_{scope}'
}

export interface LineItem {
	sku: string;
	description: string;
	quantity: number;
	unitPrice: number;
}

export interface PurchaseAgreement {
	id: string;
	orgCode: string;
	currency: string;
	lineItems: LineItem[];
	total: number;
	budgetId: string;
}

export interface Budget {
	id: string;
	orgCode: string;
	currency: string;
	allocated: number;
	booked: number;
	spent: number;
	balance: number;
}

export interface TimelineEntry {
	action: string;
	byUserId: string;
	at: string;
	note?: string;
}

export interface ChangeRequest {
	id: string;
	orgCode: string;
	agreementId: string;
	createdBy: string;
	title: string;
	status: CrStatus;
	draftChanges: { lineItems?: LineItem[] };
	totals: { baselineTotal: number; newTotal: number; delta: number };
	approvals: { userId: string; action: string; at: string }[];
	version: number;
	audit: TimelineEntry[];
}
