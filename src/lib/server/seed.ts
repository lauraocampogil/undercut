// Fill the database with well-known products (each run adds the product + its 3 competitors).
// Runs in the background, one product at a time; skips products already in the database.
import { repairDatabase } from './public.ts';
import { analyze, slugify } from './reviewdb.ts';
import * as env from '$app/env/private';
import { getProduct, indexAnalysis, listProducts } from './public.ts';

export const SEED = [
	// work & SaaS
	'notion.so', 'obsidian.md', 'evernote.com', 'todoist.com', 'ticktick.com', 'trello.com', 'asana.com', 'clickup.com', 'monday.com', 'linear.app',
	'slack.com', 'discord.com', 'zoom.us', 'calendly.com', 'canva.com', 'figma.com', 'miro.com', 'dropbox.com', 'grammarly.com', '1password.com',
	'airtable.com', 'hubspot.com', 'mailchimp.com', 'shopify.com', 'squarespace.com', 'wix.com', 'webflow.com', 'chatgpt.com', 'perplexity.ai', 'superhuman.com',
	// learning & health
	'Duolingo', 'Babbel', 'Headspace', 'Calm', 'Strava', 'MyFitnessPal', 'Nike Run Club', 'Peloton', 'Flo Period Tracker', 'Noom',
	// music & video
	'Spotify', 'Deezer', 'SoundCloud', 'Netflix', 'Disney+', 'YouTube', 'Twitch', 'CapCut', 'Lightroom', 'VSCO',
	// social & messaging
	'TikTok', 'Instagram', 'Snapchat', 'Pinterest', 'Reddit', 'Threads', 'LinkedIn', 'WhatsApp', 'Telegram', 'BeReal',
	// dating
	'Tinder', 'Bumble', 'Hinge',
	// travel & food
	'Uber', 'Lyft', 'Bolt', 'Airbnb', 'Booking.com', 'Uber Eats', 'Deliveroo', 'DoorDash', 'Too Good To Go', 'Google Maps', 'Waze', 'Citymapper',
	// money
	'Revolut', 'Wise', 'N26', 'PayPal', 'Cash App', 'Robinhood', 'Coinbase', 'Klarna',
	// shopping
	'Vinted', 'Depop', 'eBay', 'Amazon Shopping', 'Temu', 'SHEIN', 'AliExpress', 'Zalando', 'Etsy', 'IKEA',
	// mail & misc
	'Microsoft Outlook', 'Gmail', 'Spark Mail', 'Google Drive', 'Microsoft Teams'
];

export type SeedState = { running: boolean; done: number; total: number; added: number; current?: string; errors: string[]; startedAt?: string };
const state: SeedState = { running: false, done: 0, total: SEED.length, added: 0, errors: [] };
export const seedState = () => ({ ...state, errors: state.errors.slice(-5) });

const nameOf = (input: string) => slugify(input.replace(/\.(com|so|md|app|us|ai|me)$/i, ''));

export function startSeed() {
	if (state.running) return;
	Object.assign(state, { running: true, done: 0, added: 0, errors: [], startedAt: new Date().toISOString() });
	(async () => {
		for (const input of SEED) {
			state.current = input;
			try {
				if (!(await getProduct(nameOf(input)).catch(() => null))) {
					const a = await analyze(input);
					await indexAnalysis(a);
					state.added += 1 + a.competitors.length;
				}
			} catch (e) {
				state.errors.push(`${input}: ${(e as Error).message}`);
				console.warn('[undercut seed]', input, (e as Error).message);
			}
			state.done++;
		}
		state.running = false;
		state.current = undefined;
	})();
}

/** Called on every request: the first time, if the database has fewer than 100 products, fill it in the background.
 *  Set SEED=off to disable. With Supabase, running this once on any machine fills the shared database. */
let checked = false;
export function autoSeed() {
	if (checked || env.SEED === 'off' || !env.ANTHROPIC_API_KEY) return;
	checked = true;
	setTimeout(async () => {
		const n = (await listProducts().catch(() => [])).length;
		if (n < 100) {
			console.warn(`[undercut seed] database has ${n} products: filling the top 100 in the background`);
			startSeed();
		}
		// products saved while the AI grouping was failing: group them again, quietly
		void repairDatabase().catch((e) => console.warn('[repair]', e));
	}, 15_000);
}
