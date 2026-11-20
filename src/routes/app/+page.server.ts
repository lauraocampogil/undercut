import { getClientOverview } from '#lib/server/overview.ts';
import { getClient, listClients, toggleDone } from '#lib/server/store.ts';
import { getOS, monthlyQuota, pipelineStats, usedThisMonth } from '#lib/server/agency-os.ts';
import { agencyActions } from '#lib/server/agency-actions.ts';

const host = (u: string) => {
	try {
		return new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
};

export const load = async () => {
	const clients = listClients();
	const rows = await Promise.all(
		clients.map(async (c) => {
			const o = await getClientOverview(c);
			return {
				client: { id: c.id, name: c.name, color: c.color, domain: c.domain, type: c.type ?? 'web' },
				health: o.health,
				areas: o.areas.map((a) => ({ key: a.key, label: a.label, level: a.level, value: a.value, sub: a.sub, delta: a.delta, deltaInvert: a.deltaInvert, href: a.href })),
				tasks: o.tasks.filter((t) => !t.done && t.level !== 'good').map((t) => ({ id: t.id, level: t.level, area: t.area, title: t.title, action: t.action })),
				// one headline number + its trend: website visits, or app users for app-only clients
				main: o.metrics
					? { value: o.metrics.visits.total, prev: o.metrics.visits.prev, label: 'visits', daily: o.metrics.visits.daily }
					: o.app
						? { value: o.app.active.total, prev: o.app.active.prev, label: 'app users', daily: o.app.dau }
						: null
			};
		})
	);
	rows.sort((a, b) => a.health.score - b.health.score);

	const os = getOS();
	const stats = pipelineStats(os);
	const mine = os.profile ? host(os.profile.url) : '';
	// "Your own site": the agency site, when it's tracked like a client
	const own = mine ? rows.find((r) => host(r.client.domain) === mine) ?? null : null;

	// "What to post": real material from this month — wins, fixes, client results
	const content: { title: string; why: string }[] = [];
	const won = os.pipeline.filter((p) => p.stage === 'won').slice(0, 2);
	for (const w of won) content.push({ title: `Welcome post: “${w.name} joins us”`, why: 'New clients are the best social proof. Ask them for a photo.' });
	const grower = rows.filter((r) => r.main && r.main.prev > 0 && r.main.value > r.main.prev * 1.15).sort((a, b) => b.main!.value / b.main!.prev - a.main!.value / a.main!.prev)[0];
	if (grower) content.push({ title: `Result: ${grower.client.name} +${Math.round((grower.main!.value / grower.main!.prev - 1) * 100)}% ${grower.main!.label} in 28 days`, why: 'A real number from a real client — ask before naming them.' });
	const common = new Map<string, number>();
	for (const p of os.pipeline) for (const x of p.issues) common.set(x.label, (common.get(x.label) ?? 0) + 1);
	const top = [...common.entries()].sort((a, b) => b[1] - a[1])[0];
	if (top && top[1] >= 3) content.push({ title: `Tip: “${top[1]} local businesses we looked at have this problem: ${top[0]}”`, why: 'Turn what you found while prospecting into a useful post.' });
	if (os.profile) content.push({ title: `Behind the scenes: a day at ${os.profile.name}`, why: 'People hire people. Show the team, the desk, the process.' });

	return {
		rows,
		os: { profile: os.profile, blocks: os.blocks, order: os.order, sizes: os.sizes, goal: os.goal, built: os.built && !os.built.seen ? os.built : null, fresh: os.pipeline.filter((p) => p.stage === 'new').slice(0, 4) },
		stats: { ...stats, due: stats.due.slice(0, 6) },
		quota: monthlyQuota(),
		used: usedThisMonth(os),
		own,
		content: content.slice(0, 4)
	};
};

export const actions = {
	...agencyActions,
	toggle: async ({ request }) => {
		const f = await request.formData();
		const clientId = String(f.get('client') ?? '');
		const id = String(f.get('id') ?? '');
		if (getClient(clientId) && id) toggleDone(clientId, id);
		return { ok: true };
	}
};
