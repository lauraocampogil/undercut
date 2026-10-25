import { db } from '$lib/server/config';
import { sendReminder } from '$lib/server/jobs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({ reminderDay: locals.account!.reminder_day });

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const day = Number((await request.formData()).get('reminder_day'));
		if (day >= 0 && day <= 6) await db().updateAccount(locals.account!.id, { reminder_day: day });
		return { saved: true };
	},
	test: async ({ locals }) => {
		await sendReminder(locals.account!);
		return { tested: true };
	}
};
