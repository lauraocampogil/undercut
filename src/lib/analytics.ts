/**
 * Product analytics (PostHog, EU Cloud).
 * Nothing loads until the visitor accepts cookies. Every event name lives here,
 * so the events plan stays the same everywhere (see the Build Roadmap).
 */
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import type { PostHog } from 'posthog-js';

export type EventName =
	| 'cta_clicked'
	| 'analysis_started'
	| 'analysis_completed'
	| 'analysis_failed'
	| 'competitor_removed'
	| 'competitor_added'
	| 'signup_started'
	| 'signup_completed'
	| 'dashboard_viewed'
	| 'refresh_clicked'
	| 'push_enabled'
	| 'notification_opened'
	| 'plan_upgraded';

export type Consent = 'granted' | 'denied';
const KEY = 'undercut_consent';

let ph: PostHog | null = null;
let loading: Promise<void> | null = null;

export function getConsent(): Consent | null {
	if (!browser) return null;
	try {
		const v = localStorage.getItem(KEY);
		return v === 'granted' || v === 'denied' ? v : null;
	} catch {
		return null;
	}
}

export function setConsent(v: Consent) {
	try {
		localStorage.setItem(KEY, v);
	} catch {
		/* private mode: consent lasts for this page only */
	}
	if (v === 'granted') void initAnalytics();
	else ph?.opt_out_capturing();
}

export const analyticsEnabled = () => Boolean(env.PUBLIC_POSTHOG_KEY);

export async function initAnalytics() {
	if (!browser || ph || !env.PUBLIC_POSTHOG_KEY || getConsent() !== 'granted') return;
	loading ??= import('posthog-js').then(({ default: posthog }) => {
		posthog.init(env.PUBLIC_POSTHOG_KEY!, {
			api_host: env.PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
			person_profiles: 'identified_only',
			capture_pageview: 'history_change',
			capture_pageleave: true,
			enable_heatmaps: true,
			session_recording: { maskAllInputs: true, maskTextSelector: '[data-private]' }
		});
		posthog.opt_in_capturing();
		ph = posthog;
	}).catch(() => {
		// Blocked by an ad blocker or offline: the app works fine without analytics.
		loading = null;
	});
	await loading;
}

/** Records an event. A no-op without consent or without a PostHog key. */
export function track(event: EventName, props: Record<string, string | number | boolean | null> = {}) {
	ph?.capture(event, props);
}

/** Links events to an account after login. Never pass personal data other than the account id. */
export function identify(accountId: string, props: Record<string, string | number | boolean> = {}) {
	ph?.identify(accountId, props);
}

export function resetIdentity() {
	ph?.reset();
}
