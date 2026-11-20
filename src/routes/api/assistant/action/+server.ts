import { error, json } from '@sveltejs/kit';
import { getClient, toggleDone, getDone } from '#lib/server/store.ts';
import { fixAll, fixIssue, keywordToFix } from '#lib/server/fix-engine.ts';
import { publishIssue } from '#lib/server/fixes.ts';
import { getSeoAudit } from '#lib/server/seo-audit.ts';
import { addTask, getBiz } from '#lib/server/business.ts';

// Runs the action behind a button the assistant proposed — only when the agency clicks it.
export const POST = async ({ request }) => {
	const b = await request.json().catch(() => ({}));
	const a = b.action ?? {};
	// agency-level actions (no tracked site needed)
	if (a.type === 'add_task') {
		const title = String(a.title ?? '').trim().slice(0, 300);
		if (!title) error(400, 'No task');
		const c = a.client ? getBiz().clients.find((x) => x.name.toLowerCase() === String(a.client).toLowerCase()) : undefined;
		addTask({ title, clientId: c?.id, due: /^\d{4}-\d{2}-\d{2}$/.test(String(a.due ?? '')) ? String(a.due) : undefined });
		return json({ ok: true, message: `✓ Task added${a.due ? ` for ${a.due}` : ''}.` });
	}
	const client = getClient(String(b.clientId ?? ''));
	if (!client) error(404, 'Client not found');
	switch (a.type) {
		case 'fix_issue': {
			const n = await fixIssue(client, String(a.issueId));
			return json({ ok: true, message: n ? `✓ ${n} fix${n > 1 ? 'es' : ''} published on the site.` : 'Nothing left to publish for this issue.' });
		}
		case 'fix_all': {
			const n = await fixAll(client);
			return json({ ok: true, message: `✓ ${n} fix${n === 1 ? '' : 'es'} published on the site. Undo anytime in SEO → Fix it here.` });
		}
		case 'keyword_fix': {
			const r = await keywordToFix(client, String(a.keyword));
			publishIssue(client.id, `keyword:${a.keyword}`);
			return json({ ok: true, message: `✓ Live on ${r.path}: “${r.title}”` });
		}
		case 'mark_done': {
			if (!getDone(client.id)[a.taskId]) toggleDone(client.id, String(a.taskId));
			return json({ ok: true, message: '✓ Marked as done.' });
		}
		case 'rerun_audit': {
			const audit = await getSeoAudit(client, true);
			return json({ ok: true, message: `✓ Checked again: SEO health ${audit.score}/100.` });
		}
		default:
			error(400, 'Unknown action');
	}
};
