// Which agency workspace the current request belongs to (multi-tenant mode with Supabase).
import { AsyncLocalStorage } from 'node:async_hooks';

type Ctx = { ws: string; writes: Promise<unknown>[] };
const als = new AsyncLocalStorage<Ctx>();

export const currentWs = () => als.getStore()?.ws ?? null;
export const currentCtx = () => als.getStore() ?? null;

/** Run fn inside a workspace, and wait until its database writes are saved. */
export async function inWorkspace<T>(ws: string, fn: () => T | Promise<T>): Promise<T> {
	const ctx: Ctx = { ws, writes: [] };
	return als.run(ctx, async () => {
		try {
			return await fn();
		} finally {
			await Promise.allSettled(ctx.writes);
		}
	});
}
