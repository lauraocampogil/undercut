import { analyticsRows } from '#lib/server/analytics-rows.ts';

export const load = async () => ({ rows: await analyticsRows() });
