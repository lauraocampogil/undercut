// One place to call the Claude Messages API. Thinking is turned off for these short tasks (it would use the
// whole token budget and take a minute). Models disagree on how to say "off", so we retry with the form they ask for.
import * as env from '$app/env/private';

export async function messages(model: string, prompt: string, maxTokens: number, timeoutMs = 120000): Promise<Response> {
	// a text cut in the middle of an emoji leaves half a character, which makes the request invalid JSON
	prompt = prompt.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
	const send = (thinking: string) =>
		fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'x-api-key': env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
			signal: AbortSignal.timeout(timeoutMs),
			body: JSON.stringify({ model, max_tokens: maxTokens, thinking: { type: thinking }, messages: [{ role: 'user', content: prompt }] })
		});
	let res = await send('disabled');
	if (res.status === 400) {
		const t = await res.clone().text();
		const m = t.match(/"thinking":\s*\{\s*\\?"type\\?":\s*\\?"([a-z_]+)\\?"\s*\}\s*instead/);
		if (m) res = await send(m[1]);
		else if (/thinking/i.test(t)) res = await send('between_tools');
	}
	return res;
}

/** The text blocks of an answer (newer models can put a thinking block first). */
export const textOf = (j: { content?: { type: string; text?: string }[] }) => (j.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
