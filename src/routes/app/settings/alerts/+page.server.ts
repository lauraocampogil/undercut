import * as env from '$app/env/private';
import type { AlertRule } from '#lib/types.ts';
import { getAgency, saveAgency } from '#lib/server/store.ts';
import { RULES, runAlerts, sendTest, weeklyDigest } from '#lib/server/alerts.ts';

export const load = () => ({ rules: RULES, emailReady: Boolean(env.RESEND_API_KEY) });

export const actions = {
	save: async ({ request }) => {
		const f = await request.formData();
		const a = getAgency();
		const rules = Object.fromEntries(RULES.map((r) => [r.id, f.get(`rule_${r.id}`) === 'on'])) as Record<AlertRule, boolean>;
		saveAgency({ ...a, alerts: { email: String(f.get('email') ?? '').trim(), slackWebhook: String(f.get('slack') ?? '').trim(), digest: f.get('digest') === 'on', rules } });
		return { saved: true };
	},
	test: async () => ({ tested: await sendTest() }),
	run: async ({ url }) => ({ found: (await runAlerts(url.origin)).length }),
	digest: async ({ url }) => ({ digest: await weeklyDigest(url.origin) })
};
