import { fail, redirect } from '@sveltejs/kit';
import { dbOn } from '#lib/server/db.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { getAccount, listMembers, loadWorkspace, saveAccount, saveMembers } from '#lib/server/store.ts';
import { findUser, hashPassword, passwordProblem, startSession } from '#lib/server/auth.ts';
import { readResetToken, sameHash } from '#lib/server/reset.ts';

async function check(t: string) {
	const r = readResetToken(t);
	if (!r) return null;
	if (dbOn() && !r.w) return null;
	if (r.w) await loadWorkspace(r.w);
	const run = <T>(fn: () => T) => (r.w ? inWorkspace(r.w, fn) : fn());
	const u = await run(() => findUser(r.e));
	return u && sameHash(r.h, u.passwordHash) ? { r, u, run } : null;
}

export const load = async ({ url }) => {
	const t = url.searchParams.get('t') ?? '';
	const ok = await check(t);
	return { t, valid: Boolean(ok), email: ok?.u.email ?? '' };
};

export const actions = {
	default: async ({ request, cookies, url }) => {
		const f = await request.formData();
		const t = String(f.get('t') ?? '');
		const pw = String(f.get('password') ?? '');
		const ok = await check(t);
		if (!ok) return fail(400, { error: 'This link has expired or was already used. Ask for a new one.' });
		const problem = passwordProblem(pw);
		if (problem) return fail(400, { error: problem });
		await ok.run(() => {
			if (ok.u.role === 'owner') saveAccount({ ...getAccount(), passwordHash: hashPassword(pw) });
			else {
				const all = listMembers();
				const m = all.find((x) => x.email === ok.u.email);
				if (m) m.passwordHash = hashPassword(pw);
				saveMembers(all);
			}
			startSession(cookies, ok.u.email, url.protocol === 'https:');
		});
		redirect(303, '/app/analyses');
	}
};
