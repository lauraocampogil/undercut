import { getAccount, saveAccount } from '#lib/server/store.ts';

export const actions = {
	default: async ({ request }) => {
		const f = await request.formData();
		const a = getAccount();
		const language = String(f.get('language') ?? a.language);
		saveAccount({
			name: String(f.get('name') || a.name).slice(0, 80),
			email: String(f.get('email') ?? a.email).slice(0, 120),
			language: (['en', 'fr', 'nl', 'es'].includes(language) ? language : 'en') as 'en' | 'fr' | 'nl' | 'es'
		});
		return { saved: true };
	}
};
