import { fail } from '@sveltejs/kit';
import { addFeedback, myFeedback } from '#lib/server/feedback.ts';
import { listAnalyses } from '#lib/server/reviewdb.ts';
import { langOf } from '#lib/app-i18n.ts';

export const load = () => ({ sent: myFeedback().length });

const text = (f: FormData, k: string, n = 1500) => String(f.get(k) ?? '').trim().slice(0, n);
const pick = (f: FormData, k: string, ok: string[]) => (ok.includes(String(f.get(k))) ? String(f.get(k)) : '');

export const actions = {
	default: async ({ request, locals, cookies }) => {
		const f = await request.formData();
		const entry = {
			at: new Date().toISOString(),
			email: locals.user?.email ?? '',
			name: locals.user?.name ?? '',
			used: text(f, 'used'),
			why: text(f, 'why'),
			recommend: text(f, 'recommend'),
			found: pick(f, 'found', ['yes', 'maybe', 'no']),
			foundWhat: text(f, 'foundWhat'),
			liked: text(f, 'liked'),
			confusing: text(f, 'confusing'),
			missing: text(f, 'missing'),
			disappointed: pick(f, 'disappointed', ['very', 'somewhat', 'not']),
			pay: pick(f, 'pay', ['yes', 'less', 'no']),
			price: text(f, 'price', 40),
			other: text(f, 'other'),
			lang: langOf(cookies),
			analyses: listAnalyses().length
		};
		if (!entry.used && !entry.why && !entry.liked && !entry.confusing && !entry.missing && !entry.disappointed && !entry.other) return fail(400, { empty: true });
		addFeedback(entry);
		return { thanks: true };
	}
};
