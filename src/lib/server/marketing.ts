// Shared data for the public pages (nav state + database numbers).
import { listProducts } from './public.ts';

export async function marketingData(locals: App.Locals) {
	const rows = await listProducts().catch(() => []);
	return { signedIn: Boolean(locals.user), count: rows.length, reviews: rows.reduce((s, r) => s + r.stats.reviews, 0) };
}
