import { error } from '@sveltejs/kit';
import { isOwnerAdmin } from '#lib/server/access.ts';
import { allFeedback } from '#lib/server/feedback.ts';

// Beta feedback from every account: the 3 numbers that decide (Sean Ellis test, would pay, found something to change), then every answer.
export const load = async ({ locals }) => {
	if (!isOwnerAdmin(locals)) error(403, 'Only the Undercut team can open this page.');
	const all = await allFeedback();
	const pct = (k: 'disappointed' | 'pay' | 'found', v: string[]) => {
		const answered = all.filter((x) => x[k]);
		return answered.length ? Math.round((answered.filter((x) => v.includes(x[k])).length / answered.length) * 100) : null;
	};
	return {
		all,
		people: new Set(all.map((x) => x.email)).size,
		veryDisappointed: pct('disappointed', ['very']),
		wouldPay: pct('pay', ['yes']),
		payAny: pct('pay', ['yes', 'less']),
		found: pct('found', ['yes'])
	};
};
