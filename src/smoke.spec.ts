import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrListComponent } from './frontend/cr-list/cr-list.component';
import { SessionService } from './session/session.service';
import { users } from './backend/seed';

const flush = () => new Promise((r) => setTimeout(r, 0));

// Integration smoke test: UI -> API client -> backend service -> repo.
describe('integration smoke', () => {
	it('the list page renders the change requests for the user org', async () => {
		TestBed.configureTestingModule({
			imports: [CrListComponent],
			providers: [{ provide: SessionService, useValue: { user: users.mona } }],
		});
		await TestBed.compileComponents();
		const fixture: ComponentFixture<CrListComponent> = TestBed.createComponent(CrListComponent);
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
		const rows = fixture.nativeElement.querySelectorAll('.cr-list__row');
		expect(rows.length).toBe(3); // org-alpha: CR-1, CR-2, CR-APPLIED
	});
});
