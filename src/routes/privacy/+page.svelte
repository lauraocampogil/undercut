<script lang="ts">
	// Static legal page.
</script>

<svelte:head>
	<title>Privacy Policy · Undercut</title>
	<meta name="description" content="How Undercut collects, uses and protects your personal data." />
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet list(items: string[])}
	<ul class="flex flex-col gap-1 pl-4">
		{#each items as item (item)}
			<li class="flex items-start gap-2 leading-relaxed">
				<span class="text-tangerine">•</span>
				<span>{item}</span>
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet divider()}
	<div class="border-t border-dashed border-ink/15"></div>
{/snippet}

<main class="min-h-screen bg-cream px-5 py-16 sm:px-8 md:px-10 lg:px-12 xl:px-20 xl:py-24">
	<div class="mx-auto max-w-3xl">
		<a href="/" class="mb-8 inline-flex items-center gap-2 text-sm text-ink/50 transition-colors hover:text-tangerine">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
				<path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
			</svg>
			Back
		</a>

		<h1 class="display mb-2 text-[clamp(44px,7vw,80px)] text-ink">Privacy Policy</h1>
		<p class="mb-10 text-sm text-ink/40">Last updated: October 2026</p>

		<div class="flex flex-col gap-8 text-ink">
			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">1. Who is responsible</h2>
				<p class="leading-relaxed">
					<strong>Undercut</strong> is a product of <strong>Unix Creative Studio</strong>, Brussels, Belgium.<br />
					Contact: <a href="mailto:hello@undercut.app" class="text-tangerine underline">hello@undercut.app</a>
				</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">2. Personal data we collect</h2>
				<p class="leading-relaxed">When you use Undercut, we collect:</p>
				{@render list([
					'Your email address, to create your account and log you in',
					'The URL of your store and the competitor stores you choose to follow',
					'Your notification settings and, if you turn on push alerts, your browser’s push subscription',
					'Usage data (pages viewed, buttons clicked), only if you accept analytics cookies',
					'Technical data when something breaks (browser, device, error details)'
				])}
				<p class="leading-relaxed">
					We also read <strong>public catalog data</strong> from the stores you follow (product names, prices, stock). This is the same
					information any shopper can see, and it is not personal data.
				</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">3. How we collect it</h2>
				<p class="leading-relaxed">
					You give us your email and store URLs directly through the forms on the site. Usage and technical data are collected by the
					analytics and error-monitoring tools listed below. Analytics only start after you click “Accept” in the cookie banner.
				</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">4. Why we use it</h2>
				{@render list([
					'To run the service: find your competitors, track their changes and show them in your dashboard',
					'To send you notifications and, if you want it, a weekly email summary',
					'To understand how people use Undercut and make it better (PostHog, with your consent)',
					'To detect and fix bugs quickly (Sentry)'
				])}
				<p class="leading-relaxed">We never sell your data and we never show ads.</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">5. Legal basis</h2>
				<p class="leading-relaxed">
					We process your account data because it is necessary to provide the service you signed up for (contract). Analytics are based
					on your consent, which you can withdraw at any time. Error monitoring is based on our legitimate interest in keeping Undercut
					reliable and secure.
				</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">6. How long we keep it</h2>
				<p class="leading-relaxed">
					Your account data is kept as long as your account is open and deleted within 30 days after you close it. Analytics data is kept
					for a maximum of 12 months. Error reports are kept for a maximum of 90 days.
				</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">7. Who we share it with</h2>
				<p class="leading-relaxed">We only work with providers that help us run Undercut:</p>
				{@render list([
					'Supabase (database and login) — servers in Frankfurt, EU',
					'Vercel (website hosting) — with GDPR safeguards',
					'PostHog (product analytics, only with your consent) — EU Cloud',
					'Sentry (error monitoring) — with GDPR safeguards',
					'Resend (login and summary emails) — with GDPR safeguards',
					'SerpApi or Brave Search (finding competitor stores) — receives search terms, never your email'
				])}
				<p class="leading-relaxed">
					When a provider is based outside the EU, transfers are covered by the European Commission’s Standard Contractual Clauses or an
					adequacy decision.
				</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">8. Your rights</h2>
				<p class="leading-relaxed">Under the GDPR, you have the right to:</p>
				{@render list([
					'Access your data',
					'Correct your data',
					'Delete your data',
					'Restrict how we process your data',
					'Receive your data in a portable format',
					'Object to processing',
					'Withdraw your consent at any time'
				])}
				<p class="leading-relaxed">
					To use any of these rights, write to <a href="mailto:hello@undercut.app" class="text-tangerine underline">hello@undercut.app</a>.<br />
					You can also file a complaint with the
					<a href="https://www.dataprotectionauthority.be" target="_blank" rel="noopener noreferrer" class="text-tangerine underline"
						>Belgian Data Protection Authority</a
					>.
				</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">9. Changes</h2>
				<p class="leading-relaxed">
					We may update this policy from time to time. Any change will be published on this page, and we will let you know by email if it
					affects how we use your data.
				</p>
			</section>
		</div>
	</div>
</main>
