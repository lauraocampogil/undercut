<script lang="ts">
	import LegalPage from '#lib/components/LegalPage.svelte';
	import { COMPANY } from '#lib/legal.ts';
	import { PRICE } from '#lib/pricing.ts';
	const sections = [
		{ id: 'agree', h: 'Agreement', p: [`These terms are a contract between you and ${COMPANY.name} (${COMPANY.country}), which makes ${COMPANY.product}. By creating an account you accept them and our privacy policy. You must be at least 18 years old.`] },
		{ id: 'service', h: 'The service', p: [`${COMPANY.product} reads public reviews of apps, websites and SaaS products (App Store, Google Play, Hacker News, GitHub), groups the complaints into topics with AI, and compares a product with its competitors. Topic grouping is automatic and can be imperfect: always check the original reviews before making important decisions. We improve the service continuously and may change features; if we remove something essential you pay for, we tell you in advance.`] },
		{ id: 'plans', h: 'Plans and payment', p: [
			[
				`Free: ${PRICE.freeAnalyses} analyses per day and the first 15 products of the database.`,
				`Full database: ${PRICE.full}, billed monthly by Stripe. Every product of the database, every review, and ${PRICE.paidAnalyses} analyses per day.`,
				'You can cancel at any time from Settings → Billing. You keep access until the end of the month you paid for; we do not refund partial months.',
				'If you are a consumer in the EU, you can withdraw within 14 days of your first payment by writing to us. By starting to use the full database right away, you agree that the service starts immediately.',
				'If a payment fails, the account goes back to the free plan until it is paid.'
			]
		] },
		{ id: 'account', h: 'Your account', p: ['Keep your password safe and tell us about any unauthorised use. One account is for one person; do not share it.'] },
		{ id: 'claims', h: 'Claiming a product', p: ['Only claim a product you work on or represent. The fixes you mark are shown publicly; a fix only counts as verified when complaints on that topic actually drop. We can remove a claim if we have reason to think it is not legitimate.'] },
		{ id: 'use', h: 'Acceptable use', p: [
			'You agree not to:',
			[
				'scrape, copy or resell the database, or use it to build a competing service;',
				'use automated tools to run analyses or get around the daily limits;',
				'use the reviews to harass or identify the people who wrote them;',
				'break the law or other people’s rights while using Undercut.'
			],
			'We can suspend an account that breaks these rules.'
		] },
		{ id: 'content', h: 'Reviews and trademarks', p: ['Reviews belong to their authors and the platforms they were posted on; we show short excerpts with a link to the original. Product names and logos belong to their owners and are shown only to identify the products. To ask for a removal, write to us.'] },
		{ id: 'liability', h: 'Liability', p: [`${COMPANY.product} is provided “as is”. We do our best to keep it available and accurate, but we do not guarantee that the data is complete or error-free. Our total liability is limited to what you paid us in the last 12 months, except where the law does not allow such a limit.`] },
		{ id: 'end', h: 'Closing your account', p: ['You can delete your account at any time in Settings → My account. We can close an account with 30 days’ notice, or immediately for a serious breach of these terms.'] },
		{ id: 'law', h: 'Law', p: [`These terms are governed by Belgian law. If we disagree, we first try to find a solution by email (${COMPANY.email}); otherwise the courts of Brussels decide, without taking away the rights you have as a consumer in your own country.`] }
	];
</script>

<LegalPage title="Terms of service" intro="The short version: use the reviews to build better products, cancel whenever you want, and don’t resell the database." {sections} />
