// Early-access waitlist (public, no account needed): a short survey, your place in line, and a link to move up.
// Stored in the `waitlist` table with kind = 'early'; the answers are JSON in `note`.
import { randomBytes } from 'node:crypto';
import { joinWaitlist, listWaitlist, type WaitRow } from './beta.ts';
import { db, dbOn } from './db.ts';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join as joinPath } from 'node:path';

export type Answers = {
	role: string;
	building: string;
	stage: string;
	type: string;
	today: string[];
	todayOther: string;
	paid: string;
	pain: string;
	jobs: string[];
	sources: string[];
	feature: string;
	pay: string;
	price: string;
	other: string;
	lang: string;
	ref: string; // code of the person who invited them
	refCode: string; // their own code
	tier?: 'free' | 'founder' | 'regular'; // their seat, given when they confirm their email
	confirmed?: string;
	unsubscribed?: string; // asked to get no more emails
};
export const MOVE_UP = 5; // places gained per friend who joins

const parse = (r: WaitRow): Partial<Answers> => {
	try {
		return JSON.parse(r.note || '{}');
	} catch {
		return {};
	}
};
export const early = async () => (await listWaitlist()).filter((r) => r.kind === 'early').map((r) => ({ row: r, a: parse(r) }));

/** Place in line: order of arrival, minus MOVE_UP places for every friend who joined with your link. */
export async function placeOf(email: string) {
	const all = (await early()).sort((x, y) => x.row.created_at.localeCompare(y.row.created_at));
	const refs = new Map<string, number>();
	for (const { a } of all) if (a.ref) refs.set(a.ref, (refs.get(a.ref) ?? 0) + 1);
	const score = (i: number) => i - (refs.get(all[i].a.refCode ?? '') ?? 0) * MOVE_UP;
	const ranked = all.map((x, i) => ({ ...x, s: score(i), i })).sort((x, y) => x.s - y.s || x.i - y.i);
	const me = ranked.findIndex((x) => x.row.email === email.toLowerCase());
	if (me < 0) return null;
	return { place: me + 1, total: all.length, friends: refs.get(ranked[me].a.refCode ?? '') ?? 0, refCode: ranked[me].a.refCode ?? '' };
}

export async function join(email: string, name: string, a: Omit<Answers, 'refCode'>) {
	const e = email.trim().toLowerCase();
	const old = (await early()).find((x) => x.row.email === e);
	const refCode = old?.a.refCode || randomBytes(4).toString('hex');
	const answers: Answers = { ...a, ref: old?.a.ref || (a.ref !== refCode ? a.ref : ''), refCode, tier: old?.a.tier, confirmed: old?.a.confirmed };
	await joinWaitlist({ email: e, name, agency: a.role.slice(0, 120), kind: 'early', website: a.building.slice(0, 300), note: JSON.stringify(answers) });
	return placeOf(e);
}

export const byRefCode = async (code: string) => (await early()).find((x) => x.a.refCode === code) ?? null;

/** Remove someone (test entries, spam, or a person who asks). */
export async function removeFromWaitlist(email: string) {
	if (dbOn()) return void (await db.remove('waitlist', { email: `eq.${email}` }));
	const f = joinPath(process.cwd(), '.data', 'waitlist.json');
	if (existsSync(f)) writeFileSync(f, JSON.stringify(JSON.parse(readFileSync(f, 'utf8')).filter((r: WaitRow) => r.email !== email), null, 2));
}

/** Change someone's answers (their seat, the confirmation date). */
export async function setAnswers(email: string, a: Partial<Answers>) {
	const note = JSON.stringify(a);
	if (dbOn()) return void (await db.update('waitlist', { email: `eq.${email}` }, { note }));
	const f = joinPath(process.cwd(), '.data', 'waitlist.json');
	if (!existsSync(f)) return;
	const rows: WaitRow[] = JSON.parse(readFileSync(f, 'utf8'));
	const r = rows.find((x) => x.email === email);
	if (r) r.note = note;
	writeFileSync(f, JSON.stringify(rows, null, 2));
}
