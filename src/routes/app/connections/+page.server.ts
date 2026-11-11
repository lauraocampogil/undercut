import { redirect } from '@sveltejs/kit';
// Old URL — everything lives in Settings now.
export const load = ({ url }) => redirect(307, `/app/settings${url.search}#connections`);
