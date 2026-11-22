import { getAgency, getBilling, listClients, getTokens } from '#lib/server/store.ts';
import { googleConfigured } from '#lib/server/google.ts';
import { unreadCount } from '#lib/server/alerts.ts';
import { isAdmin } from '#lib/server/beta.ts';
import { dbOn } from '#lib/server/db.ts';
import { getOS } from '#lib/server/agency-os.ts';
import { themeStyle } from '#lib/theme.ts';
import { inboxItems } from '#lib/server/inbox.ts';

export const load = ({ locals }) => {
	const t = getTokens();
	const u = locals.user;
	const os = getOS();
	return {
		theme: themeStyle(os.theme.accent),
		accent: os.theme.accent,
		siteColor: os.profile?.color ?? null,
		agency: getAgency(),
		// the person signed in (never the password hash)
		account: { name: u?.name || 'Agency owner', email: u?.email ?? '', role: u?.role ?? 'owner' },
		billing: getBilling(),
		unread: unreadCount(),
		toApprove: os.profile ? inboxItems().length : 0,
		hasProfile: Boolean(os.profile),
		beta: dbOn(),
		isAdmin: dbOn() ? isAdmin(u?.email) : u?.role === 'owner',
		clients: listClients()
			.map((c) => ({ id: c.id, name: c.name, color: c.color, type: c.type ?? 'web' }))
			.sort((a, b) => a.name.localeCompare(b.name)),
		google: { configured: googleConfigured(), connected: Boolean(t), email: t?.email ?? null }
	};
};
