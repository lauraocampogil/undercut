import { error } from '@sveltejs/kit';
import { getBiz } from '#lib/server/business.ts';
import { getOS } from '#lib/server/agency-os.ts';
import { getAgency } from '#lib/server/store.ts';
import { businessActions } from '#lib/server/business-actions.ts';

export const load = ({ params }) => {
	const b = getBiz();
	const doc = b.docs.find((d) => d.id === params.id);
	if (!doc) error(404, 'Not found');
	return {
		doc,
		client: b.clients.find((c) => c.id === doc.clientId) ?? null,
		clients: b.clients.map((c) => ({ id: c.id, name: c.name })),
		details: b.details,
		agencyName: getOS().profile?.name || getAgency().name,
		invoiced: doc.kind === 'quote' ? (b.docs.find((d) => d.fromQuote === doc.id) ?? null) : null
	};
};

export const actions = businessActions;
