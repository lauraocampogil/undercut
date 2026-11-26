import { fullAccess } from '#lib/server/access.ts';
import { getAccount, saveAccount, getAgency, getBilling, listClients, getTokens } from '#lib/server/store.ts';
import { googleConfigured } from '#lib/server/google.ts';
import { unreadCount } from '#lib/server/alerts.ts';
import { isAdmin } from '#lib/server/beta.ts';
import { dbOn } from '#lib/server/db.ts';
import { getOS } from '#lib/server/agency-os.ts';
import { themeStyle } from '#lib/theme.ts';
import { inboxItems } from '#lib/server/inbox.ts';
import { syncSubscription } from '#lib/server/billing.ts';
import { langOf } from '#lib/app-i18n.ts';

export const load = async ({ locals, cookies }) => {
	await syncSubscription();
	const t = getTokens();
	const u = locals.user;
	const os = getOS();
	try {
		const acc = getAccount();
		const lang = langOf(cookies);
		if (u && acc.language !== lang) saveAccount({ ...acc, language: lang });
	} catch {
		/* not in an account */
	}
	return {
		theme: themeStyle(os.theme.accent),
		accent: os.theme.accent,
		siteColor: os.profile?.color ?? null,
		agency: getAgency(),
		// the person signed in (never the password hash)
		account: { name: u?.name || 'Agency owner', email: u?.email ?? '', role: u?.role ?? 'owner' },
		billing: getBilling(),
		full: fullAccess(locals),
		unread: unreadCount(),
		toApprove: os.profile ? inboxItems({ payments: false }).length : 0,
		// the app speaks the language the agency chose (default: the language of its own site)
		ui: 'en',
		lang: langOf(cookies),
		betaTester: (() => { try { return Boolean(getAccount().beta); } catch { return false; } })(),
		hasProfile: Boolean(os.profile),
		beta: dbOn(),
		isAdmin: dbOn() ? isAdmin(u?.email) : u?.role === 'owner',
		clients: listClients()
			.map((c) => ({ id: c.id, name: c.name, color: c.color, type: c.type ?? 'web' }))
			.sort((a, b) => a.name.localeCompare(b.name)),
		google: { configured: googleConfigured(), connected: Boolean(t), email: t?.email ?? null }
	};
};

