import { getOS } from '#lib/server/agency-os.ts';
import { agencyActions } from '#lib/server/agency-actions.ts';
import { businessActions } from '#lib/server/business-actions.ts';
import { emailReady } from '#lib/server/email.ts';
import { mailboxInfo } from '#lib/server/mailbox.ts';
import { mailboxActions } from '#lib/server/mailbox-actions.ts';

// Settings: the agency and who to find, the app's language, the morning email.
export const load = () => {
	const os = getOS();
	return { profile: os.profile, mailbox: mailboxInfo(), brief: { on: os.brief !== false, ready: emailReady() } };
};

export const actions = { mailbox: mailboxActions.mailbox, mailboxOff: mailboxActions.mailboxOff, setup: agencyActions.setup, ui: agencyActions.ui, brief: businessActions.brief };
