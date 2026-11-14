import { fail } from '@sveltejs/kit';
import { getClient } from '#lib/server/store.ts';
import { CHANNELS, campaignStats, deleteCampaign, listCampaigns, socialOverview, trackedLink, upsertCampaign, type ChannelId } from '#lib/server/campaigns.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const list = listCampaigns(client);
	const { stats, detected } = await campaignStats(client, list);
	return {
		days,
		channels: Object.entries(CHANNELS).map(([id, c]) => ({ id, ...c })),
		campaigns: list.map((c) => ({ ...c, link: trackedLink(c), postLinks: (c.posts ?? []).map((p) => ({ post: p, link: trackedLink(c, p) })), stats: stats[c.id] })),
		detected,
		social: socialOverview(client, days),
		open: url.searchParams.get('c')
	};
};

function parse(f: FormData) {
	const s = (k: string) => String(f.get(k) ?? '').trim();
	const n = (k: string) => (s(k) ? Math.max(0, Number(s(k).replace(',', '.'))) || undefined : undefined);
	return {
		name: s('name'),
		channel: (s('channel') in CHANNELS ? s('channel') : 'other') as ChannelId,
		url: s('url'),
		start: s('start') || new Date().toISOString().slice(0, 10),
		end: s('end') || undefined,
		budget: n('budget'),
		goal: n('goal'),
		slug: s('slug') || undefined,
		posts: s('posts') ? s('posts').split(/[,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 20) : undefined
	};
}

export const actions = {
	save: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const f = await request.formData();
		const c = parse(f);
		if (!c.name) return fail(400, { error: 'Give the campaign a name.' });
		let url = c.url || client.domain;
		if (!/^https?:\/\//.test(url)) url = `https://${url}`;
		try {
			new URL(url);
		} catch {
			return fail(400, { error: 'The landing page address does not look valid.' });
		}
		if (c.end && c.end < c.start) return fail(400, { error: 'The end date is before the start date.' });
		const saved = upsertCampaign(client, { ...c, url, id: String(f.get('id') ?? '') || undefined });
		return { saved: saved.id, link: trackedLink(saved) };
	},
	remove: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		deleteCampaign(client, String((await request.formData()).get('id')));
		return { removed: true };
	},
	adopt: async ({ params, request }) => {
		// turn a UTM campaign detected on the site into a tracked campaign
		const client = getClient(params.id);
		if (!client) return fail(404);
		const f = await request.formData();
		const slug = String(f.get('slug'));
		const src = String(f.get('source') ?? '').toLowerCase();
		const med = String(f.get('medium') ?? '').toLowerCase();
		const channel = (Object.entries(CHANNELS).find(([, c]) => c.source === src && c.medium === med)?.[0] ??
			Object.entries(CHANNELS).find(([, c]) => c.source === src)?.[0] ??
			'other') as ChannelId;
		const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
		upsertCampaign(client, { name: slug.replace(/[-_]/g, ' ').replace(/^\w/, (m) => m.toUpperCase()), slug, channel, url: client.domain, start });
		return { adopted: slug };
	}
};
