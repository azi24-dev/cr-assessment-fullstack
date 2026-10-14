import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
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
export class CrDetailComponent implements OnInit, OnChanges {
	@Input() id!: string;
	@Output() changed = new EventEmitter<void>();

	state: ViewState<ChangeRequest> = idle();
	submitting = false;
	actionError?: string;
	rejectReason = '';

	constructor(private readonly client: CrApiClient, private readonly session: SessionService) {}

	ngOnInit(): void {
		void this.load();
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['id'] && !changes['id'].firstChange) {
			void this.load();
		}
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
		return this.detail?.status === 'PENDING_APPROVAL' && this.session.user.policies.includes('cr_a_o');
	}

	get canReject(): boolean {
		return this.detail?.status === 'PENDING_APPROVAL' && this.session.user.policies.includes('cr_x_o');
	}

	async approve(): Promise<void> {
		this.submitting = true;
		this.actionError = undefined;
		try {
			await this.client.approve(this.session.user, this.id, new Date().toISOString());
			await this.load();
			this.changed.emit();
		} catch (err) {
			this.actionError = (err as Error).message;
		} finally {
			this.submitting = false;
		}
	}

	async reject(): Promise<void> {
		if (!this.rejectReason.trim()) {
			this.actionError = 'A reason is required to reject.';
			return;
		}
		this.submitting = true;
		this.actionError = undefined;
		try {
			await this.client.reject(this.session.user, this.id, new Date().toISOString(), this.rejectReason.trim());
			await this.load();
			this.changed.emit();
		} catch (err) {
			this.actionError = (err as Error).message;
		} finally {
			this.submitting = false;
		}
	}
}
