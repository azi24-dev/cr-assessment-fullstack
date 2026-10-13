import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrListComponent } from '../frontend/cr-list/cr-list.component';
import { CrDetailComponent } from '../frontend/cr-detail/cr-detail.component';
import { SessionService } from '../session/session.service';
import { users } from '../backend/seed';

/**
 * Demo app shell that hosts the list + detail screens so you can click through the full UI->client->
 * service flow in a browser (run `npm start`). The whole stack runs in-process — the `CrApiClient`
 * calls the in-memory backend service directly, no server needed.
 *
 * The "Acting as" switcher changes the current user and reloads both panes — handy for demoing
 * permission-aware action states in your walkthrough video.
 */
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule, CrListComponent, CrDetailComponent],
	templateUrl: './app.component.html',
})
export class AppComponent {
	readonly users = users;
	readonly userKeys = Object.keys(users);
	selectedId: string | null = 'CR-2';
	show = true;

	constructor(public readonly session: SessionService) {}

	switchUser(key: string): void {
		this.session.user = users[key];
		this.reload();
	}

	onSelect(id: string): void {
		this.selectedId = id;
	}

	private reload(): void {
		this.show = false;
		setTimeout(() => (this.show = true));
	}
}
