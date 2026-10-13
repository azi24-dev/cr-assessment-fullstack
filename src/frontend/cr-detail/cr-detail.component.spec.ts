import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../backend/seed';
import { ReqUser } from '../../backend/cr.types';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush();
	fixture.detectChanges();
	return fixture;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.mona, 'CR-2'); // CR-2 is PENDING_APPROVAL
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2')).not.toBeNull();
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-2'); // viewer: cr_r_o only
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});
});
