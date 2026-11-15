import { error, json } from '@sveltejs/kit';
import { getClient } from '#lib/server/store.ts';
import { fixAll, fixIssue, howToFix, keywordToFix } from '#lib/server/fix-engine.ts';
import { publishIssue } from '#lib/server/fixes.ts';
import { checkLive } from '#lib/server/live-check.ts';

// Used by every "Fix" / "How to fix" button in the app.
export const POST = async ({ request }) => {
	const b = await request.json().catch(() => ({}));
	const client = getClient(String(b.clientId ?? ''));
	if (!client) error(404, 'Client not found');
	switch (b.action) {
		case 'issue':
			return json({ ok: true, published: await fixIssue(client, String(b.issueId)) });
		case 'all':
			return json({ ok: true, published: await fixAll(client) });
		case 'keyword': {
			const r = await keywordToFix(client, String(b.keyword ?? '').slice(0, 80));
			if (b.publish) publishIssue(client.id, `keyword:${b.keyword}`);
			return json({ ok: true, ...r, published: Boolean(b.publish) });
		}
		case 'verify':
			return json({ ok: true, check: await checkLive(client, String(b.path ?? '/').slice(0, 300) || '/') });
		case 'howto':
			return json({ ok: true, howto: await howToFix(client, String(b.problem ?? ''), String(b.detail ?? '')) });
		default:
			error(400, 'Unknown action');
	}
};
