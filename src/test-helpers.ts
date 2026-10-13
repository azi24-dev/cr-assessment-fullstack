import { buildSeed, users } from './backend/seed';
import { CrRepo } from './backend/cr-repo';
import { CrService } from './backend/cr-service';

/** Build the backend stack directly (repo + seed -> service) for backend-level tests. */
export function buildApp() {
	const seed = buildSeed();
	const repo = new CrRepo();
	repo.seed(seed.changeRequests);
	const service = new CrService(repo, seed.agreements, seed.budgets);
	return { service, repo, agreements: seed.agreements, budgets: seed.budgets, users };
}

export const T = '2026-03-05T10:00:00.000Z';
export const flush = (ms = 0): Promise<void> => new Promise((r) => setTimeout(r, ms));
