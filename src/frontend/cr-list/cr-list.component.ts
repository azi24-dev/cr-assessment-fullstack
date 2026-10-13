import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrApiClient } from '../../integration/cr-api-client';
import { SessionService } from '../../session/session.service';
import { ChangeRequest } from '../../backend/cr.types';
import { idle, loading, ViewState } from '../view-state';

/**
 * Change Request LIST page (provided, working). Loads the caller's CRs via the API client and renders
 * loading / loaded / empty / error states. Use it as the pattern for the detail page.
 */
@Component({
	selector: 'app-cr-list',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './cr-list.component.html',
})
export class CrListComponent implements OnInit {
	@Output() select = new EventEmitter<string>();
	state: ViewState<ChangeRequest[]> = idle();

	constructor(private readonly client: CrApiClient, private readonly session: SessionService) {}

	ngOnInit(): void {
		void this.load();
	}

	async load(): Promise<void> {
		this.state = loading();
		try {
			const rows = await this.client.list(this.session.user);
			this.state = { status: rows.length ? 'loaded' : 'empty', data: rows };
		} catch (err) {
			this.state = { status: 'error', data: null, error: (err as Error).message };
		}
	}

	get rows(): ChangeRequest[] {
		return this.state.data ?? [];
	}
}
