import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { CrApiClient } from '../../integration/cr-api-client';
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

	it('disables Approve and hides Reject for a DRAFT CR', async () => {
		const fixture = await render(users.mona, 'CR-1');
		expect(getApproveBtn(fixture).disabled).toBe(true);
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
	});

	it('disables Approve and hides Reject for a terminal APPLIED CR', async () => {
		const fixture = await render(users.mona, 'CR-APPLIED');
		expect(getApproveBtn(fixture).disabled).toBe(true);
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
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

		getApproveBtn(fixture).click();
		await flush();
		await flush();
		fixture.detectChanges();

		expect(getStatus(fixture)).toBe('APPROVED');
	});

	it('keeps Approve disabled while submission is in flight', async () => {
		const fixture = await render(users.mona, 'CR-2');

		getApproveBtn(fixture).click();
		fixture.detectChanges();

		expect(getApproveBtn(fixture).disabled).toBe(true);

		await flush();
		await flush();
		fixture.detectChanges();
	});
});

// ─── reject through the client ───────────────────────────────────────────────

describe('CrDetailComponent — reject through client', () => {
	it('reject button is disabled when no reason is entered', async () => {
		const fixture = await render(users.mona, 'CR-2');
		const rejectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__reject-btn');
		expect(rejectBtn.disabled).toBe(true);
	});

	it('transitions the CR to REJECTED and re-renders after clicking Reject with a reason', async () => {
		const fixture = await render(users.mona, 'CR-2');
		expect(getStatus(fixture)).toBe('PENDING_APPROVAL');

		const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.cr-actions__reason');
		textarea.value = 'Budget exceeded';
		textarea.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		const rejectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__reject-btn');
		expect(rejectBtn.disabled).toBe(false);

		rejectBtn.click();
		await flush();
		await flush();
		fixture.detectChanges();

		expect(getStatus(fixture)).toBe('REJECTED');
	});

	it('shows an error message when rejection fails', async () => {
		const fixture = await render(users.mona, 'CR-2');
		const client = TestBed.inject(CrApiClient);
		client.failNext = true;

		const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.cr-actions__reason');
		textarea.value = 'Some reason';
		textarea.dispatchEvent(new Event('input'));
		fixture.detectChanges();

		fixture.nativeElement.querySelector('.cr-actions__reject-btn').click();
		await flush();
		fixture.detectChanges();

		const errorEl = fixture.nativeElement.querySelector('.cr-actions__error');
		expect(errorEl).not.toBeNull();
		expect(errorEl.textContent).toContain('Network error');
	});
});

// ─── apply through the client ────────────────────────────────────────────────

describe('CrDetailComponent — apply through client', () => {
	it('transitions the CR to APPLIED after approve then apply', async () => {
		const fixture = await render(users.mona, 'CR-2');

		// approve first
		getApproveBtn(fixture).click();
		await flush();
		await flush();
		fixture.detectChanges();
		expect(getStatus(fixture)).toBe('APPROVED');

		// apply button now visible
		const applyBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__apply');
		expect(applyBtn).not.toBeNull();
		expect(applyBtn.disabled).toBe(false);

		applyBtn.click();
		await flush();
		await flush();
		fixture.detectChanges();

		expect(getStatus(fixture)).toBe('APPLIED');
	});

	it('shows an error when apply fails due to a network error', async () => {
		const fixture = await render(users.mona, 'CR-2');
		const client = TestBed.inject(CrApiClient);

		// approve first
		getApproveBtn(fixture).click();
		await flush();
		await flush();
		fixture.detectChanges();

		// simulate network failure on apply
		client.failNext = true;
		fixture.nativeElement.querySelector('.cr-actions__apply').click();
		await flush();
		fixture.detectChanges();

		const errorEl = fixture.nativeElement.querySelector('.cr-actions__error');
		expect(errorEl).not.toBeNull();
		expect(errorEl.textContent).toContain('Network error');
	});
});
