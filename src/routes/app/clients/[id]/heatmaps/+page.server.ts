import { redirect } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { hasWeb } from '#lib/server/store.ts';
import { behaviourTasks, getHeatmap, type Device } from '#lib/server/tracking.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	if (!hasWeb(client)) redirect(307, `/app/clients/${client.id}`);
	const device: Device = url.searchParams.get('device') === 'mobile' ? 'mobile' : 'desktop';
	const path = url.searchParams.get('path') ?? '/';
	const mode: 'clicks' | 'scroll' = url.searchParams.get('mode') === 'scroll' ? 'scroll' : 'clicks';
	const heat = getHeatmap(client, path, device);
	const base = env.PUBLIC_BASE_URL || url.origin;
	return { heat, device, path, mode, tasks: behaviourTasks(heat), snippet: `<script defer src="${base}/u.js" data-site="${client.id}"></script>` };
};
