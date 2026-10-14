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
	fixture.componentRef.setInput('id', id);
	fixture.detectChanges();
	await flush();
	fixture.detectChanges();
	return fixture;
}

function getStatus(fixture: ComponentFixture<CrDetailComponent>): string {
	return fixture.nativeElement.querySelector('.cr-status')?.textContent?.trim() ?? '';
}

function getApproveBtn(fixture: ComponentFixture<CrDetailComponent>): HTMLButtonElement {
	return fixture.nativeElement.querySelector('.cr-actions__approve');
}

// ─── basic rendering & permission gate ──────────────────────────────────────

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.mona, 'CR-2');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2')).not.toBeNull();
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-2');
		expect(getApproveBtn(fixture).disabled).toBe(true);
	});
});

// ─── id input change (ngOnChanges) ──────────────────────────────────────────

describe('CrDetailComponent — id input change', () => {
	async function switchTo(fixture: ComponentFixture<CrDetailComponent>, id: string): Promise<void> {
		fixture.componentRef.setInput('id', id);
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
	}

	it('reloads content when id changes to a different CR', async () => {
		const fixture = await render(users.mona, 'CR-2');
		expect(getStatus(fixture)).toBe('PENDING_APPROVAL');

		await switchTo(fixture, 'CR-APPLIED');
		expect(getStatus(fixture)).toBe('APPLIED');
	});

	it('updates the title when id changes', async () => {
		const fixture = await render(users.mona, 'CR-2');
		const titleBefore: string = fixture.nativeElement.querySelector('.cr-detail__header h2').textContent;

		await switchTo(fixture, 'CR-APPLIED');
		const titleAfter: string = fixture.nativeElement.querySelector('.cr-detail__header h2').textContent;

		expect(titleAfter).not.toBe(titleBefore);
		expect(titleAfter).toContain('Already applied');
	});

	it('disables Approve when id changes to a terminal CR', async () => {
		const fixture = await render(users.mona, 'CR-2');
		expect(getApproveBtn(fixture).disabled).toBe(false); // mona can approve CR-2

		await switchTo(fixture, 'CR-APPLIED'); // APPLIED is terminal
		expect(getApproveBtn(fixture).disabled).toBe(true);
	});

	it('enables Approve when id changes back to a pending CR', async () => {
		const fixture = await render(users.mona, 'CR-APPLIED');
		expect(getApproveBtn(fixture).disabled).toBe(true); // APPLIED — no action

		await switchTo(fixture, 'CR-2'); // PENDING_APPROVAL
		expect(getApproveBtn(fixture).disabled).toBe(false);
	});
});

// ─── approve through the client (integration path) ──────────────────────────

describe('CrDetailComponent — approve through client', () => {
	it('transitions the CR to APPROVED and re-renders after clicking Approve', async () => {
		const fixture = await render(users.mona, 'CR-2');
		expect(getStatus(fixture)).toBe('PENDING_APPROVAL');

		getApproveBtn(fixture).click();       // triggers component approve()
		await flush();                         // client.approve() resolves
		await flush();                         // client.get() (inside load()) resolves
		fixture.detectChanges();

		expect(getStatus(fixture)).toBe('APPROVED');
	});

	it('keeps Approve disabled while submission is in flight', async () => {
		const fixture = await render(users.mona, 'CR-2');

		getApproveBtn(fixture).click();
		fixture.detectChanges(); // submitting = true, button should disable

		expect(getApproveBtn(fixture).disabled).toBe(true);

		await flush();
		await flush();
		fixture.detectChanges();
	});
});
