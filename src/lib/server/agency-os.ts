// The agency's own cockpit: its profile (from its URL), its prospects pipeline and which dashboard blocks it shows.
import { readData, writeData, getBilling } from './store.ts';
import { PLANS } from '#lib/plans.ts';
import type { AgencyProfile } from './agency-profile.ts';
import { findProspects, type Prospect } from './prospects.ts';

export type Stage = 'new' | 'contacted' | 'talking' | 'won' | 'lost';
export type PipelineItem = Prospect & { stage: Stage; addedAt: string; updatedAt: string; note?: string; next?: string /* follow-up date YYYY-MM-DD */; value?: number /* € per month if signed */ };
export type BlockId = 'prospects' | 'pipeline' | 'clients' | 'calendar' | 'site' | 'goals' | 'todo' | 'content';
export const BLOCKS: { id: BlockId; label: string; help: string }[] = [
	{ id: 'prospects', label: 'New prospects', help: 'Local businesses that need what you sell' },
	{ id: 'pipeline', label: 'Pipeline', help: 'Who you contacted, who is talking, who signed' },
	{ id: 'clients', label: 'Clients', help: 'Your clients’ sites and apps: what needs you' },
	{ id: 'todo', label: 'This week', help: 'The most important things to do' },
	{ id: 'calendar', label: 'Agenda', help: 'Follow-ups and calls you planned' },
	{ id: 'site', label: 'Your own site', help: 'Is your agency site fast and findable?' },
	{ id: 'goals', label: 'Goals', help: 'Revenue and clients targets' },
	{ id: 'content', label: 'What to post', help: 'Ideas for your socials this week' }
];

export type AgencyOS = {
	profile: AgencyProfile | null;
	pipeline: PipelineItem[];
	blocks: Record<BlockId, boolean>;
	order: BlockId[];
	runs: { at: string; n: number }[]; // prospect searches, for the monthly quota
	goal: { wonPerMonth: number };
	theme: { accent: string | null; picked?: boolean }; // null = neutral; picked = chosen by the user (not from the site)
	sizes: Partial<Record<BlockId, Size>>; // width of each block on the dashboard grid
};
export type Size = 's' | 'm' | 'l' | 'xl';
export const DEFAULT_SIZE: Record<BlockId, Size> = { prospects: 'l', pipeline: 's', clients: 'xl', todo: 'm', calendar: 'm', site: 's', goals: 's', content: 's' };

const FILE = 'agency-os.json';
const DEFAULT_BLOCKS = Object.fromEntries(BLOCKS.map((b) => [b.id, b.id !== 'content'])) as Record<BlockId, boolean>;

export function getOS(): AgencyOS {
	const s = readData<AgencyOS>(FILE, { profile: null, pipeline: [], blocks: DEFAULT_BLOCKS, order: BLOCKS.map((b) => b.id), runs: [], goal: { wonPerMonth: 2 }, theme: { accent: null }, sizes: {} });
	return { ...s, sizes: { ...DEFAULT_SIZE, ...(s.sizes ?? {}) }, goal: s.goal ?? { wonPerMonth: 2 }, theme: s.theme ?? { accent: null }, blocks: { ...DEFAULT_BLOCKS, ...s.blocks }, order: [...new Set([...(s.order ?? []), ...BLOCKS.map((b) => b.id)])] as BlockId[] };
}
export function saveOS(s: AgencyOS) {
	writeData(FILE, s);
}

/** Prospects per month by plan (PLANS). */
export function monthlyQuota() {
	return PLANS[getBilling().plan]?.prospects ?? 50;
}
export function usedThisMonth(s: AgencyOS) {
	const since = Date.now() - 30 * 864e5;
	return s.runs.filter((r) => Date.parse(r.at) > since).reduce((t, r) => t + r.n, 0);
}

export function addProspects(list: Prospect[]) {
	const s = getOS();
	const now = new Date().toISOString();
	const have = new Set(s.pipeline.map((p) => p.id));
	const fresh = list.filter((p) => !have.has(p.id)).map((p) => ({ ...p, stage: 'new' as Stage, addedAt: now, updatedAt: now }));
	s.pipeline = [...fresh, ...s.pipeline].slice(0, 2000);
	s.runs = [...s.runs, { at: now, n: fresh.length }].slice(-200);
	saveOS(s);
	return fresh.length;
}

export function setStage(id: string, stage: Stage, note?: string) {
	updateItem(id, { stage, ...(note !== undefined ? { note: note.slice(0, 1000) } : {}) });
}

/** Change a pipeline item (stage, note, follow-up date, value). Contacting someone sets a follow-up in 4 days by default. */
export function updateItem(id: string, patch: Partial<Pick<PipelineItem, 'stage' | 'note' | 'next' | 'value'>>) {
	const s = getOS();
	const p = s.pipeline.find((x) => x.id === id);
	if (!p) return;
	if (patch.stage === 'contacted' && p.stage === 'new' && patch.next === undefined && !p.next) patch.next = new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10);
	if (patch.stage === 'won' || patch.stage === 'lost') patch.next = patch.next ?? '';
	Object.assign(p, patch, { updatedAt: new Date().toISOString() });
	if (p.next === '') delete p.next;
	saveOS(s);
}

export function removeItem(id: string) {
	const s = getOS();
	s.pipeline = s.pipeline.filter((x) => x.id !== id);
	saveOS(s);
}

export function setProfile(profile: AgencyProfile) {
	const s = getOS();
	s.profile = profile;
	// the dashboard takes the colour of the agency's site, unless the user picked one
	if (profile.color && !s.theme.picked) s.theme = { accent: profile.color };
	saveOS(s);
}

export function setTheme(accent: string | null) {
	const s = getOS();
	s.theme = accent ? { accent, picked: true } : { accent: null, picked: true };
	saveOS(s);
}

export function setGoal(wonPerMonth: number) {
	const s = getOS();
	s.goal = { wonPerMonth: Math.max(1, Math.min(100, Math.round(wonPerMonth))) };
	saveOS(s);
}

/** Pipeline numbers for the cockpit. */
export function pipelineStats(s: AgencyOS) {
	const month = new Date().toISOString().slice(0, 7);
	const today = new Date().toISOString().slice(0, 10);
	const by = (st: Stage) => s.pipeline.filter((p) => p.stage === st);
	const wonMonth = by('won').filter((p) => p.updatedAt.startsWith(month));
	const contacted = s.pipeline.filter((p) => p.stage !== 'new').length;
	return {
		counts: { new: by('new').length, contacted: by('contacted').length, talking: by('talking').length, won: by('won').length, lost: by('lost').length },
		wonMonth: wonMonth.length,
		wonValue: wonMonth.reduce((t, p) => t + (p.value ?? 0), 0),
		due: s.pipeline.filter((p) => p.next && p.next <= today && p.stage !== 'won' && p.stage !== 'lost'),
		upcoming: s.pipeline.filter((p) => p.next && p.stage !== 'won' && p.stage !== 'lost').sort((a, b) => (a.next! < b.next! ? -1 : 1)).slice(0, 8),
		replyRate: contacted ? Math.round(((by('talking').length + by('won').length) / contacted) * 100) : null
	};
}

/** "Ask to change": plain-language edits to the dashboard. Returns what was done. */
export function applyAsk(text: string): string {
	const s = getOS();
	const t = text.toLowerCase();
	const hide = /\b(hide|cache|masque|retire|enlève|enleve|supprime|verberg|remove)\b/.test(t);
	const show = /\b(show|affiche|montre|ajoute|add|toon|voeg)\b/.test(t);
	const first = /\b(first|en premier|en haut|top|bovenaan|eerst)\b/.test(t);
	const match = BLOCKS.find((b) => {
		const words: Record<BlockId, RegExp> = {
			prospects: /prospect|lead|nouveaux clients|new clients|klanten zoeken/,
			pipeline: /pipeline|crm|suivi|deals?/,
			clients: /clients?\b|klanten|sites? clients/,
			calendar: /calend|agenda|meeting|rendez-vous|rdv/,
			site: /mon site|my site|own site|site de l.agence|eigen site/,
			goals: /goal|objectif|doel|revenue|chiffre/,
			todo: /to-?do|tâches|taches|cette semaine|this week/,
			content: /post|contenu|content|social|réseaux|instagram/
		};
		return words[b.id].test(t);
	});
	if (!match) return 'I did not understand which block — try “hide calendar”, “show what to post” or “prospects first”.';
	if (hide) s.blocks[match.id] = false;
	else if (show || first) s.blocks[match.id] = true;
	if (first) s.order = [match.id, ...s.order.filter((b) => b !== match.id)];
	if (!hide && !show && !first) s.blocks[match.id] = !s.blocks[match.id];
	saveOS(s);
	return `${s.blocks[match.id] ? 'Showing' : 'Hiding'} “${match.label}”${first ? ' at the top' : ''}.`;
}

/** Find `n` new prospects (never ones already in the pipeline), within the monthly quota. */
export async function findMore(n = 5): Promise<{ added: number; error?: string }> {
	const s = getOS();
	if (!s.profile) return { added: 0, error: 'Add your agency’s URL first.' };
	const left = monthlyQuota() - usedThisMonth(s);
	if (left <= 0) return { added: 0, error: `You used your ${monthlyQuota()} prospects this month. Upgrade for more.` };
	const run = await findProspects(s.profile, Math.min(n, left), new Set(s.pipeline.map((p) => p.id)));
	if (run.error) return { added: 0, error: run.error };
	if (!run.prospects.length) return { added: 0, error: `No new businesses needing you around ${s.profile.city} right now — try a nearby city in your agency settings.` };
	return { added: addProspects(run.prospects) };
}

/** Drag-and-drop layout: order, visibility and width of each block. Unknown ids are ignored. */
export function setLayout(order: string[], sizes: Record<string, string>, visible: string[]) {
	const s = getOS();
	const ids = BLOCKS.map((b) => b.id);
	const ok = (x: string): x is BlockId => (ids as string[]).includes(x);
	s.order = [...new Set([...order.filter(ok), ...ids])];
	for (const [k, v] of Object.entries(sizes)) if (ok(k) && ['s', 'm', 'l', 'xl'].includes(v)) s.sizes[k] = v as Size;
	if (visible.length) for (const id of ids) s.blocks[id] = visible.includes(id);
	saveOS(s);
}
