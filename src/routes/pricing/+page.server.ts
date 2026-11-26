import { redirect } from '@sveltejs/kit';

// Everything lives on the landing page now.
export const load = () => redirect(301, '/#pricing');
