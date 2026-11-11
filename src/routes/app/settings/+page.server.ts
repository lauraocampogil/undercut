import { getAgency, saveAgency } from '#lib/server/store.ts';

export const actions = {
	default: async ({ request }) => {
		const f = await request.formData();
		const a = getAgency();
		saveAgency({
			name: String(f.get('name') || a.name),
			color: String(f.get('color') || a.color),
			reportFooter: String(f.get('reportFooter') ?? a.reportFooter)
		});
		return { saved: true };
	}
};
