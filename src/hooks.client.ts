import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

// Error monitoring in the browser. Disabled when PUBLIC_SENTRY_DSN is empty.
if (env.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: env.PUBLIC_SENTRY_DSN,
		environment: env.PUBLIC_SENTRY_ENVIRONMENT || 'development',
		tracesSampleRate: 0.2,
		// Record a replay only when an error happens, with every input masked.
		replaysSessionSampleRate: 0,
		replaysOnErrorSampleRate: 1,
		integrations: [Sentry.replayIntegration({ maskAllInputs: true, maskAllText: false })]
	});
}

export const handleError = Sentry.handleErrorWithSentry();
