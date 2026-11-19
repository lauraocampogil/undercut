// Form actions shared by the cockpit (/app) and the prospects page (/app/prospects).
import { fail, type RequestEvent } from '@sveltejs/kit';
import { profileFromUrl, type Service } from './agency-profile.ts';
import { applyAsk, findMore, getOS, removeItem, setGoal, setLayout, setProfile, setTheme, updateItem, type Stage } from './agency-os.ts';
import { isHex } from '#lib/theme.ts';

const SERVICES: Service[] = ['web', 'app', 'social', 'seo', 'branding', 'ads'];
const STAGES: Stage[] = ['new', 'contacted', 'talking', 'won', 'lost'];
type E = RequestEvent;

export const agencyActions = {
	setup: async ({ request }: E) => {
		const f = await request.formData();
		const raw = String(f.get('url') ?? '').trim();
		const city = String(f.get('city') ?? '').trim().slice(0, 60);
		const name = String(f.get('name') ?? '').trim().slice(0, 60);
		const picked = f.getAll('services').map(String).filter((s): s is Service => SERVICES.includes(s as Service));
		const current = getOS().profile;
		let p;
		if (raw && raw !== current?.url) {
			try {
				p = await profileFromUrl(raw);
			} catch {
				return fail(400, { setupError: 'That doesn’t look like a web address.' });
			}
		} else if (current) p = { ...current };
		else return fail(400, { setupError: 'Paste your agency’s website or Instagram.' });
		// what the user typed always wins over what we detected (only when the form sent those fields)
		if (f.has('city')) p.city = city || p.city;
		if (f.has('name') && name) p.name = name;
		if (f.has('servicesSent')) p.services = picked.length ? picked : p.services;
		p.needs = p.city ? undefined : p.needs || 'Which city do you work in?';
		setProfile(p);
		return { setupOk: true };
	},
	find: async () => {
		const r = await findMore(5);
		if (r.error) return fail(400, { findError: r.error });
		return { found: r.added };
	},
	stage: async ({ request }: E) => {
		const f = await request.formData();
		const stage = String(f.get('stage')) as Stage;
		if (STAGES.includes(stage)) updateItem(String(f.get('id')), { stage });
		return { ok: true };
	},
	item: async ({ request }: E) => {
		const f = await request.formData();
		const id = String(f.get('id'));
		const patch: Parameters<typeof updateItem>[1] = {};
		if (f.has('note')) patch.note = String(f.get('note')).slice(0, 1000);
		if (f.has('next')) patch.next = String(f.get('next')).slice(0, 10);
		if (f.has('value')) patch.value = Math.max(0, Number(String(f.get('value')).replace(',', '.')) || 0) || undefined;
		updateItem(id, patch);
		return { saved: id };
	},
	remove: async ({ request }: E) => {
		removeItem(String((await request.formData()).get('id')));
		return { ok: true };
	},
	goal: async ({ request }: E) => {
		setGoal(Number((await request.formData()).get('won')) || 2);
		return { ok: true };
	},
	layout: async ({ request }: E) => {
		const f = await request.formData();
		try {
			setLayout(JSON.parse(String(f.get('order') ?? '[]')), JSON.parse(String(f.get('sizes') ?? '{}')), JSON.parse(String(f.get('visible') ?? '[]')));
		} catch {
			return fail(400, { error: 'Could not save the layout.' });
		}
		return { ok: true };
	},
	theme: async ({ request }: E) => {
		const f = await request.formData();
		const v = String(f.get('accent') ?? '');
		if (v === 'site') setTheme(getOS().profile?.color ?? null);
		else setTheme(isHex(v) ? v : null);
		return { ok: true };
	},
	ask: async ({ request }: E) => {
		const text = String((await request.formData()).get('q') ?? '').slice(0, 300);
		// colour requests: "make it blue", "en violet", "neutre", "couleur de mon site"
		const t = text.toLowerCase();
		const COLORS: [RegExp, string | null | 'site'][] = [
			[/undercut|default|défaut|neutr|black|noir|zwart|sobre|no colou?r|sans couleur|gris|grey|gray/, null],
			[/(my|mon|de mon|mijn) site|site colou?r|couleur du site/, 'site'],
			[/blue|bleu|blauw/, '#2F6BFF'],
			[/purple|violet|paars/, '#7C5CFF'],
			[/orange|oranje/, '#E8590C'],
			[/pink|rose|roze/, '#E64980'],
			[/green|vert|groen/, '#12B886'],
			[/yellow|jaune|geel/, '#F2C94C'],
			[/red|rouge|rood/, '#E03131']
		];
		if (/colou?r|couleur|kleur|make it|en |thème|theme/.test(t)) {
			const hit = COLORS.find(([re]) => re.test(t));
			if (hit) {
				const v = hit[1] === 'site' ? getOS().profile?.color ?? null : hit[1];
				setTheme(v);
				return { asked: v ? 'Done — new colour applied.' : 'Back to black & white.' };
			}
		}
		return { asked: applyAsk(text) };
	}
};
