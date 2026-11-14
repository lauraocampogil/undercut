import { getAccount } from '#lib/server/store.ts';

// Public landing page. "Open the app" shows once a workspace exists.
export const load = () => ({ hasWorkspace: Boolean(getAccount().email) });
