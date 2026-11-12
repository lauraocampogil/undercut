import { json } from '@sveltejs/kit';
import { ask, type Msg } from '#lib/server/assistant.ts';

export const POST = async ({ request }) => {
	const b = await request.json().catch(() => ({}));
	const messages: Msg[] = Array.isArray(b.messages) ? b.messages.filter((m: Msg) => m && (m.role === 'user' || m.role === 'assistant')) : [];
	if (!messages.length) return json({ reply: '', actions: [], ai: false });
	return json(await ask(b.clientId || null, messages));
};
