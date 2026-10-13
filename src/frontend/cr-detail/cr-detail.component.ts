import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrApiClient } from '../../integration/cr-api-client';
import { SessionService } from '../../session/session.service';
import { ChangeRequest, TimelineEntry } from '../../backend/cr.types';
import { idle, loading, ViewState } from '../view-state';

/**
 * Change Request DETAIL page: loads a CR via the API client and renders its status, totals, timeline,
 * and permission-aware Approve/Reject actions. `load` and the template skeleton are provided; the
 * permission gating and the approve/reject actions are yours.
 */
@Component({
	selector: 'app-cr-detail',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './cr-detail.component.html',
})
export class CrDetailComponent implements OnInit {
	@Input() id!: string;

	state: ViewState<ChangeRequest> = idle();
	submitting = false;
	actionError?: string;
	rejectReason = '';

	constructor(private readonly client: CrApiClient, private readonly session: SessionService) {}

	ngOnInit(): void {
		void this.load();
	}

	async load(): Promise<void> {
		this.state = loading();
		this.actionError = undefined;
		try {
			const detail = await this.client.get(this.session.user, this.id);
			this.state = { status: 'loaded', data: detail };
		} catch (err) {
			this.state = { status: 'error', data: null, error: (err as Error).message };
		}
	}

	get detail(): ChangeRequest | null {
		return this.state.data;
	}

	/** Approval history for display (read-only). */
	get timeline(): TimelineEntry[] {
		return this.detail?.audit ?? [];
	}

	onReasonInput(value: string): void {
		this.rejectReason = value;
	}

	/** Whether the current user may approve the loaded CR. */
	get canApprove(): boolean {
		// NOTE: this only looks at status. The UI must also respect the user's permissions.
		return this.detail?.status === 'PENDING_APPROVAL';
	}

	get canReject(): boolean {
		return this.detail?.status === 'PENDING_APPROVAL';
	}

	async approve(): Promise<void> {
		// TODO: perform the approve action through the client and reflect the outcome in the view.
		throw new Error('approve() not implemented');
	}

	async reject(): Promise<void> {
		// TODO: require a reason, then perform the reject action through the client and reflect the
		//       outcome in the view.
		throw new Error('reject() not implemented');
	}
}
