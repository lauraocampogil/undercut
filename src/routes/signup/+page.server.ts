import { fail, redirect } from '@sveltejs/kit';
import { getAgency, getBilling, listClients, saveAccount, saveAgency, saveBilling, getAccount } from '#lib/server/store.ts';
import { PLANS, type PlanId } from '#lib/plans.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const load = ({ url }) => ({ plan: url.searchParams.get('plan') ?? 'agency' });

export const actions = {
	default: async ({ request }) => {
		const f = await request.formData();
		const name = String(f.get('name') ?? '').trim();
		const email = String(f.get('email') ?? '').trim().toLowerCase();
		const agency = String(f.get('agency') ?? '').trim();
		if (!name || !agency || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { name, email, agency, error: 'Fill in your name, a valid email and your agency name.' });
		saveAccount({ ...getAccount(), name, email });
		saveAgency({ ...getAgency(), name: agency });
		const plan = String(f.get('plan') ?? '');
		if (plan in PLANS) saveBilling({ ...getBilling(), plan: 'trial' as PlanId });
		// Start with an empty workspace unless they want to explore the example clients
		if (f.get('examples') !== 'on') {
			mkdirSync(join(process.cwd(), '.data'), { recursive: true });
			writeFileSync(join(process.cwd(), '.data', 'clients.json'), JSON.stringify(listClients().filter((c) => !c.demo), null, 2));
		}
		redirect(303, '/onboarding');
	}
};
