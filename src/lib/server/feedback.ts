// Beta feedback: answers kept in each account ("feedback.json"); the admin page reads them from every account.
import { readData, writeData } from './store.ts';
import { db, dbOn } from './db.ts';

export type Feedback = { at: string; email: string; name: string; used: string; why: string; recommend: string; found: string; foundWhat: string; liked: string; confusing: string; missing: string; disappointed: string; pay: string; price: string; other: string; lang: string; analyses: number };

export const myFeedback = () => readData<Feedback[]>('feedback.json', []);
export const addFeedback = (f: Feedback) => writeData('feedback.json', [...myFeedback(), f]);

/** Every answer from every account, newest first. */
export async function allFeedback(): Promise<Feedback[]> {
	if (!dbOn()) return [...myFeedback()].reverse();
	const rows = await db.select<{ value: Feedback[] }>('kv', { key: 'eq.feedback.json', select: 'value' });
	return rows.flatMap((r) => r.value ?? []).sort((x, y) => y.at.localeCompare(x.at));
}
