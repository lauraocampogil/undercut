import { fail } from '@sveltejs/kit';
import { dbOn } from '#lib/server/db.ts';
import { getAccount, listMembers, saveAccount, saveMembers } from '#lib/server/store.ts';
import { hashPassword, passwordProblem, startSession, verifyPassword, findUser } from '#lib/server/auth.ts';

export const load = ({ locals }) => {
	const u = locals.user!;
	const a = getAccount();
	return { me: u.role === 'owner' ? { name: a.name, email: a.email, language: a.language } : { name: u.name, email: u.email, language: a.language }, hasPassword: Boolean(findUser(u.email)?.passwordHash), locked: locals.locked, role: u.role, emailLocked: dbOn() };
};

export const actions = {
	profile: async ({ request, locals }) => {
		const f = await request.formData();
		const u = locals.user!;
		const name = String(f.get('name') ?? '').trim().slice(0, 80);
		if (u.role === 'owner') {
			const a = getAccount();
			const language = String(f.get('language') ?? a.language);
			// multi-agency mode: the email is the login key — it stays as is
			const email = dbOn() ? a.email : String(f.get('email') ?? a.email).trim().toLowerCase().slice(0, 120);
			if (a.passwordHash && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { error: 'Your email is used to log in — it must be valid.' });
			saveAccount({ ...a, name: name || a.name, email, language: (['en', 'fr', 'nl', 'es'].includes(language) ? language : 'en') as 'en' | 'fr' | 'nl' | 'es' });
		} else {
			const all = listMembers();
			const m = all.find((x) => x.email === u.email);
			if (m) m.name = name || m.name;
			saveMembers(all);
		}
		return { saved: true };
	},
	password: async ({ request, locals, cookies, url }) => {
		const f = await request.formData();
		const u = locals.user!;
		const current = String(f.get('current') ?? '');
		const next = String(f.get('password') ?? '');
		const stored = findUser(u.email)?.passwordHash;
		if (u.role === 'owner' && !getAccount().email) return fail(400, { pwError: 'Add your email first — it is your login.' });
		if (stored && !verifyPassword(current, stored)) return fail(400, { pwError: 'The current password is wrong.' });
		const problem = passwordProblem(next);
		if (problem) return fail(400, { pwError: problem });
		if (u.role === 'owner') saveAccount({ ...getAccount(), passwordHash: hashPassword(next) });
		else {
			const all = listMembers();
			const m = all.find((x) => x.email === u.email);
			if (m) m.passwordHash = hashPassword(next);
			saveMembers(all);
		}
		startSession(cookies, u.email, url.protocol === 'https:');
		return { pwSaved: true };
	}
};
