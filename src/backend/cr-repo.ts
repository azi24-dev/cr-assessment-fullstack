import { ChangeRequest } from './cr.types';
import { ReqUser } from './cr.types';

/**
 * In-memory repository. Reads are filtered to the caller's org through `scoped()`.
 */
export class CrRepo {
	private store = new Map<string, ChangeRequest>();

	seed(crs: ChangeRequest[]): void {
		for (const cr of crs) this.store.set(cr.id, { ...cr });
	}

	private scoped(user: ReqUser, crs: ChangeRequest[]): ChangeRequest[] {
		return crs.filter((cr) => cr.orgCode === user.orgCode);
	}

	list(user: ReqUser): ChangeRequest[] {
		return this.scoped(user, [...this.store.values()]);
	}

	findOne(user: ReqUser, id: string): ChangeRequest | undefined {
		const cr = this.store.get(id);
		return this.scoped(user, cr ? [cr] : [])[0];
	}

	save(cr: ChangeRequest): ChangeRequest {
		this.store.set(cr.id, { ...cr });
		return cr;
	}
}
