// Turns raw numbers into plain-language findings + one concrete action each.
// Rules first (free, instant); an optional Claude call rewrites the weekly summary.
import * as env from '$app/env/private';
import type { Client, Insight, Metrics, SitemapReport } from '#lib/types.ts';

const change = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);

export type Draft = Omit<Insight, 'id'>;

export function withIds(list: Draft[]): Insight[] {
	return list.map((i) => ({
		...i,
		id: (i.area + '-' + i.title.replace(/[\d.,+%()#↑↓-]+/g, ' '))
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '')
	}));
}

export function sortInsights(list: Insight[]) {
	const order = { bad: 0, warn: 1, good: 2 };
	return list.sort((a, b) => order[a.level] - order[b.level]);
}

export function buildInsights(m: Metrics, sitemap?: SitemapReport | null, extra: Draft[] = []): Insight[] {
	const out: Draft[] = [];
	const v = change(m.visits.total, m.visits.prev);
	const measuring = m.sources.ga4 !== 'off' && m.sources.ga4 !== 'error' && (m.visits.total > 0 || m.visits.prev > 0 || m.sources.ga4 === 'google');

	if (!measuring)
		out.push({
			level: 'warn',
			area: 'Tracking',
			title: 'Not measuring visits yet',
			meaning: 'No visits came in from the Undercut snippet and no Google Analytics property is linked.',
			action: 'Paste the snippet from Setup on the site (or link GA4). Numbers appear with the first visit.'
		});
	else if (m.visits.prev === 0 && m.sources.ga4 === 'tracking')
		out.push({
			level: 'good',
			area: 'Traffic',
			title: `Measuring started: ${m.visits.total.toLocaleString('en')} visit${m.visits.total === 1 ? '' : 's'} so far`,
			meaning: 'The snippet works. Trends and comparisons appear once there is a full period to compare with.',
			action: 'Nothing to do — just let the visits come in.'
		});
	else if (v >= 10)
		out.push({
			level: 'good',
			area: 'Traffic',
			title: `Visits up ${v}%`,
			meaning: `${m.visits.total.toLocaleString('en')} visits in ${m.range.days} days, against ${m.visits.prev.toLocaleString('en')} the period before.`,
			action: `Find out which page drove it (see Top pages) and share it again on social media.`
		});
	else if (v <= -10)
		out.push({
			level: 'bad',
			area: 'Traffic',
			title: `Visits down ${Math.abs(v)}%`,
			meaning: `Fewer people reached the site than in the previous ${m.range.days} days.`,
			action: `Check whether Google Search clicks also fell. If yes, it is an SEO problem; if not, look at social and ads.`
		});
	else
		out.push({
			level: 'good',
			area: 'Traffic',
			title: `Traffic is stable (${v >= 0 ? '+' : ''}${v}%)`,
			meaning: `No big change compared to the previous period.`,
			action: `Good moment to publish one new page targeting a search people already make (see Google Search).`
		});

	// Position: lower number = better
	const posDelta = m.search.position > 0 && m.search.prevPosition > 0 ? +(m.search.prevPosition - m.search.position).toFixed(1) : 0;
	if (m.sources.gsc === 'off')
		out.push({
			level: 'warn',
			area: 'Google Search',
			title: 'Search Console is not linked',
			meaning: 'Without it Undercut cannot see which Google searches bring people, or the site’s position.',
			action: 'In Setup, connect Google and pick the Search Console property of this site.'
		});
	if (posDelta >= 0.5)
		out.push({
			level: 'good',
			area: 'Google Search',
			title: `Climbing in Google (+${posDelta} places)`,
			meaning: `On average the site now appears around position ${m.search.position}. Position 1 is the top of the page.`,
			action: `Keep the pages that rank updated; Google rewards fresh content.`
		});
	else if (posDelta <= -0.5)
		out.push({
			level: 'warn',
			area: 'Google Search',
			title: `Slipping in Google (${posDelta} places)`,
			meaning: `The site shows up lower in results than before (average position ${m.search.position}).`,
			action: `Update the title and first paragraph of the top 3 pages so they match what people search for.`
		});

	// Quick win: query on page 2 with impressions
	const quick = m.search.queries.find((q) => q.position > 8 && q.position <= 20 && q.impressions > 50);
	if (quick)
		out.push({
			level: 'warn',
			area: 'Google Search',
			title: `Quick win: "${quick.query}"`,
			meaning: `${quick.impressions} people saw the site for this search, but it sits at position ${quick.position}, on page 2 where almost nobody clicks.`,
			action: `Add a section answering "${quick.query}" on the most relevant page, with those words in a heading.`
		});

	// Low CTR on a page-1 query
	const lowCtr = m.search.queries.find((q) => q.position <= 5 && q.impressions > 100 && q.clicks / q.impressions < 0.03);
	if (lowCtr)
		out.push({
			level: 'warn',
			area: 'Google Search',
			title: `Seen but not clicked: "${lowCtr.query}"`,
			meaning: `The site is on page 1 for this search, yet only ${Math.round((lowCtr.clicks / lowCtr.impressions) * 1000) / 10}% of people click.`,
			action: `Rewrite the page title and meta description to promise a clear benefit.`
		});

	if (m.maps) {
		const actions = m.maps.calls + m.maps.directions + m.maps.websiteClicks;
		const mc = change(actions, m.maps.prevTotal);
		out.push({
			level: mc >= 0 ? 'good' : 'warn',
			area: 'Google Maps',
			title: `${actions} actions from Google Maps (${mc >= 0 ? '+' : ''}${mc}%)`,
			meaning: `${m.maps.calls} calls, ${m.maps.directions} route requests and ${m.maps.websiteClicks} website clicks came straight from the Google Business profile.`,
			action:
				mc >= 0
					? `Ask happy customers for a review this week; reviews keep the profile on top.`
					: `Add new photos and a post to the Google Business profile; inactive profiles drop.`
		});
	}

	const conv = change(m.conversions.total, m.conversions.prev);
	if (!measuring) {
		/* nothing to say about contacts before anything is measured */
	} else if (m.conversions.total === 0 && m.visits.total >= 100)
		out.push({
			level: 'bad',
			area: 'Conversions',
			title: 'No conversions measured',
			meaning: 'Either nobody contacted the business through the site, or contact forms are not tracked.',
			action: m.sources.ga4 === 'tracking' ? 'The snippet counts forms, calls, emails and WhatsApp clicks. Check the contact page works and the phone number is a tap-to-call link.' : 'Install the Undercut snippet (it counts forms, calls, emails and WhatsApp clicks automatically) or mark the form submission as a key event in GA4.'
		});
	else
		out.push({
			level: conv >= 0 ? 'good' : 'warn',
			area: 'Conversions',
			title: `${m.conversions.total} contacts / sales (${conv >= 0 ? '+' : ''}${conv}%)`,
			meaning: `This is what really matters: people who filled a form, called or bought.`,
			action: conv >= 0 ? `Make sure every contact gets an answer within 24 h.` : `Check the contact page still works on mobile.`
		});

	if (m.tags && !m.tags.googleTagFound)
		out.push({
			level: 'bad',
			area: 'Tracking',
			title: 'Google tag missing in Tag Manager',
			meaning: `Container ${m.tags.container} has ${m.tags.tagCount} tags but none sends data to GA4, so numbers may be incomplete.`,
			action: 'In Tag Manager add a "Google Tag" with the GA4 measurement ID, then publish.'
		});

	if (sitemap) {
		if (!sitemap.found)
			out.push({
				level: 'bad',
				area: 'Sitemap',
				title: 'No sitemap.xml',
				meaning: 'Google has no list of the pages to index, so new pages are found slowly.',
				action: 'Generate a sitemap.xml (most CMS do it in one click) and submit it in Search Console.'
			});
		else if (sitemap.broken > 0)
			out.push({
				level: 'bad',
				area: 'Sitemap',
				title: `${sitemap.broken} broken page${sitemap.broken > 1 ? 's' : ''} in the sitemap`,
				meaning: 'The sitemap points Google to pages that return an error.',
				action: 'Remove or redirect those URLs (see the Sitemap section).'
			});
		else
			out.push({
				level: 'good',
				area: 'Sitemap',
				title: `Sitemap OK · ${sitemap.urlCount} pages`,
				meaning: 'Google can find every page listed and the sampled pages respond correctly.',
				action: sitemap.newestLastmod ? `Last update ${sitemap.newestLastmod}. Nothing to do.` : 'Nothing to do.'
			});
	}

	return sortInsights(withIds([...out, ...extra]));
}

export function healthScore(insights: Insight[]) {
	const score = Math.max(
		0,
		Math.min(100, 100 - insights.filter((i) => i.level === 'bad').length * 10 - insights.filter((i) => i.level === 'warn').length * 4)
	);
	return { score, level: (score >= 75 ? 'good' : score >= 50 ? 'warn' : 'bad') as 'good' | 'warn' | 'bad' };
}

export function ruleSummary(client: Client, m: Metrics, insights: Insight[]) {
	const v = change(m.visits.total, m.visits.prev);
	const top = insights.find((i) => i.level !== 'good');
	const best = insights.find((i) => i.level === 'good');
	const none = !m.visits.total && !m.visits.prev && m.sources.ga4 !== 'google';
	const fresh = !none && !m.visits.prev && m.sources.ga4 === 'tracking';
	const visits = `${m.visits.total.toLocaleString('en')} visit${m.visits.total === 1 ? '' : 's'}`;
	return [
		none ? `Undercut is not measuring ${client.name} yet.` : fresh ? `Undercut just started measuring ${client.name}: ${visits} so far.` : `${client.name} had ${visits} in the last ${m.range.days} days (${v >= 0 ? '+' : ''}${v}%).`,
		best && !fresh ? `Good news: ${best.title.charAt(0).toLowerCase() + best.title.slice(1)}.` : '',
		top ? `Priority this week: ${top.action}` : 'Nothing urgent this week.'
	]
		.filter(Boolean)
		.join(' ');
}

export async function aiSummary(client: Client, m: Metrics, insights: Insight[], lang = 'en'): Promise<{ text: string; ai: boolean }> {
	const fallback = { text: ruleSummary(client, m, insights), ai: false };
	if (!env.ANTHROPIC_API_KEY) return fallback;
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'x-api-key': env.ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01',
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
				max_tokens: 300,
				messages: [
					{
						role: 'user',
						content: `You write a 3-sentence weekly website summary for a small business owner who knows nothing about SEO. Language: ${lang}. No jargon, no markdown. End with the single most useful action.\n\nBusiness: ${client.name}\nFindings:\n${insights.map((i) => `- ${i.title}: ${i.meaning}`).join('\n')}`
					}
				]
			})
		});
		if (!res.ok) return fallback;
		const j = await res.json();
		const text = j.content?.[0]?.text?.trim();
		return text ? { text, ai: true } : fallback;
	} catch {
		return fallback;
	}
}
