import { fail, redirect } from '@sveltejs/kit';
import { getClient, hasApp } from '#lib/server/store.ts';
import { getStoreTracker, saveStoreState, searchApps, snapshotStore, storeState, storeTasks } from '#lib/server/appstore.ts';

const COUNTRIES = ['be', 'fr', 'nl', 'lu', 'de', 'es', 'gb', 'us', 'ca', 'ch'];

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	if (!hasApp(client)) redirect(307, `/app/clients/${client.id}`);
	const q = (url.searchParams.get('q') ?? '').trim();
	const t = await getStoreTracker(client);
	const results = q && !client.demo ? await searchApps(q, t.cc).catch(() => []) : [];
	return { t, tasks: storeTasks(t), q, results, countries: COUNTRIES };
};

export const actions = {
	country: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const cc = String((await request.formData()).get('cc'));
		if (!COUNTRIES.includes(cc)) return fail(400);
		const s = storeState(client);
		if (s.cc !== cc) {
			// rankings differ per country: start a new history
			saveStoreState(client, { ...s, cc, history: [], comp: {} });
			await snapshotStore(client, true).catch(() => null);
		}
		return { ok: true };
	},
	add: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const id = String((await request.formData()).get('id')).replace(/\D/g, '');
		const s = storeState(client);
		if (!id || id === client.app?.iosId) return fail(400);
		if (!s.competitors.includes(id)) s.competitors = [...s.competitors, id].slice(0, 5);
		saveStoreState(client, s);
		await snapshotStore(client, true).catch(() => null);
		return { ok: true };
	},
	remove: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const id = String((await request.formData()).get('id'));
		const s = storeState(client);
		s.competitors = s.competitors.filter((c) => c !== id);
		delete s.comp[id];
		saveStoreState(client, s);
		return { ok: true };
	}
};
