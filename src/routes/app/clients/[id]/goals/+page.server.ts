import { fail } from '@sveltejs/kit';
import { getClient, hasApp, hasWeb } from '#lib/server/store.ts';
import { goalCoach, goalFile, goalProgress, METRICS, saveGoalFile, stripeMrr, type GoalMetric } from '#lib/server/goals.ts';

export const load = async ({ parent }) => {
	const { client } = await parent();
	const gf = goalFile(client);
	const progress = await Promise.all(gf.goals.map((g) => goalProgress(client, g)));
	const metrics = (Object.keys(METRICS) as GoalMetric[]).filter((k) => (METRICS[k].web ? hasWeb(client) : METRICS[k].app ? hasApp(client) : true)).map((k) => ({ key: k, ...METRICS[k] }));
	return {
		progress,
		metrics,
		coach: await goalCoach(client, progress),
		stripe: gf.stripeKey ? `${gf.stripeKey.slice(0, 8)}…${gf.stripeKey.slice(-4)}` : null,
		arpu: gf.arpu ?? null,
		hasMrr: gf.goals.some((g) => g.metric === 'mrr')
	};
};

const num = (v: FormDataEntryValue | null) => Number(String(v ?? '').replace(',', '.').replace(/[^\d.]/g, ''));

export const actions = {
	add: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const f = await request.formData();
		const metric = String(f.get('metric')) as GoalMetric;
		const target = num(f.get('target'));
		const deadline = String(f.get('deadline'));
		if (!(metric in METRICS)) return fail(400, { error: 'Pick what you want to grow.' });
		if (!target || target <= 0) return fail(400, { error: 'Give a target number.' });
		if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || deadline <= new Date().toISOString().slice(0, 10)) return fail(400, { error: 'Pick a date in the future.' });
		const gf = goalFile(client);
		gf.goals = [...gf.goals.filter((g) => g.metric !== metric), { id: `${metric}-${Date.now().toString(36)}`, metric, target, deadline, createdAt: new Date().toISOString() }].slice(0, 4);
		saveGoalFile(client, gf);
		return { ok: true };
	},
	remove: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const id = String((await request.formData()).get('id'));
		const gf = goalFile(client);
		gf.goals = gf.goals.filter((g) => g.id !== id);
		saveGoalFile(client, gf);
		return { ok: true };
	},
	stripe: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const key = String((await request.formData()).get('key') ?? '').trim();
		const gf = goalFile(client);
		if (!key) {
			delete gf.stripeKey;
			saveGoalFile(client, gf);
			return { ok: true };
		}
		if (!/^(rk|sk)_(live|test)_/.test(key)) return fail(400, { stripeError: 'This does not look like a Stripe key (it starts with rk_live_…).' });
		const r = await stripeMrr(key);
		if ('error' in r) return fail(400, { stripeError: `Stripe refused the key: ${r.error}` });
		gf.stripeKey = key;
		gf.arpu = r.customers ? r.mrr / r.customers : gf.arpu;
		gf.mrrManual = [...(gf.mrrManual ?? []), { value: r.mrr, at: new Date().toISOString() }].slice(-60);
		saveGoalFile(client, gf);
		return { ok: true };
	},
	mrr: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const f = await request.formData();
		const gf = goalFile(client);
		const v = num(f.get('mrr'));
		const arpu = num(f.get('arpu'));
		if (f.get('mrr') && Number.isFinite(v)) gf.mrrManual = [...(gf.mrrManual ?? []).filter((x) => x.at.slice(0, 10) !== new Date().toISOString().slice(0, 10)), { value: v, at: new Date().toISOString() }].slice(-60);
		if (arpu > 0) gf.arpu = arpu;
		saveGoalFile(client, gf);
		return { ok: true };
	}
};
