import { getOS } from '#lib/server/agency-os.ts';
import { agencyActions } from '#lib/server/agency-actions.ts';
import { businessActions } from '#lib/server/business-actions.ts';
import { emailReady } from '#lib/server/email.ts';

// Settings: the agency and who to find, the app's language, the morning email.
export const load = () => {
	const os = getOS();
	return { profile: os.profile, brief: { on: os.brief !== false, ready: emailReady() } };
};

export const actions = { setup: agencyActions.setup, ui: agencyActions.ui, brief: businessActions.brief };
