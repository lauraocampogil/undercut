<script lang="ts">
	// Static legal page.
</script>

<svelte:head>
	<title>Terms of Service · Undercut</title>
	<meta name="description" content="The rules for using Undercut." />
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

		<h1 class="display mb-2 text-[clamp(44px,7vw,80px)] text-ink">Terms of Service</h1>
		<p class="mb-10 text-sm text-ink/40">Last updated: October 2026</p>

		<div class="flex flex-col gap-8 text-ink">
			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">1. About these terms</h2>
				<p class="leading-relaxed">These terms apply when you use <strong>Undercut</strong>, a product of <strong>Unix Creative Studio</strong>, Brussels, Belgium. By creating an account, you agree to them. Questions? <a href="mailto:hello@undercut.app" class="text-tangerine underline">hello@undercut.app</a></p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">2. What Undercut does</h2>
				<p class="leading-relaxed">Undercut finds online stores similar to yours and watches their public catalog: prices, sales, new products and stock. When something changes, we show it in your dashboard and can send you a notification.</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">3. Your account</h2>
				{@render list(["You need a valid email address to create an account", "Keep access to your email safe: it is how you log in", "You are responsible for what happens in your account", "One account per person or business"])}
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">4. Plans and payment</h2>
				<p class="leading-relaxed">The Free plan costs nothing. Paid plans (Starter and Pro) are billed monthly in advance, prices include VAT where it applies. The Starter plan includes a 14-day free trial: if you cancel before it ends, you pay nothing. We will tell you at least 30 days in advance before changing a price.</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">5. Cancelling</h2>
				<p class="leading-relaxed">You can cancel anytime from Settings. Your plan stays active until the end of the period you already paid for, then switches to Free. We do not refund partial months, except where the law requires it.</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">6. Fair use</h2>
				<p class="leading-relaxed">When you use Undercut, you agree not to:</p>
				{@render list(["Use it to break the law or anyone’s rights", "Try to access other people’s accounts or data", "Overload, copy or reverse-engineer the service", "Resell the data or the service without our written permission"])}
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">7. Data accuracy</h2>
				<p class="leading-relaxed">We read public data from other websites, and those websites can change or be unavailable. We do our best to be accurate and on time, but we cannot guarantee that every change is detected or that every price is correct. Always check before making an important business decision.</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">8. Liability</h2>
				<p class="leading-relaxed">Undercut is provided “as is”. To the extent allowed by law, we are not liable for indirect losses such as lost sales or profits. Our total liability is limited to the amount you paid us in the last 12 months. Nothing in these terms limits rights you have as a consumer under Belgian or EU law.</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">9. Suspension</h2>
				<p class="leading-relaxed">We may suspend or close an account that breaks these terms. If we decide to stop the service, we will give you at least 30 days’ notice and refund any unused paid period.</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">10. Privacy</h2>
				<p class="leading-relaxed">How we handle your personal data is explained in our <a href="/privacy" class="text-tangerine underline">Privacy Policy</a>.</p>
			</section>

			{@render divider()}

			<section class="flex flex-col gap-3">
				<h2 class="text-xl font-semibold">11. Changes and applicable law</h2>
				<p class="leading-relaxed">We may update these terms. Important changes will be announced by email at least 30 days before they apply. These terms are governed by Belgian law, and the courts of Brussels have jurisdiction, unless consumer law gives you the right to go to the courts where you live.</p>
			</section>
		</div>
	</div>
</main>
