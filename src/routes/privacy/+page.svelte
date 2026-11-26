<script lang="ts">
	import LegalPage from '#lib/components/LegalPage.svelte';
	import { COMPANY, SUBPROCESSORS } from '#lib/legal.ts';
	const sections = [
		{ id: 'who', h: 'Who we are', p: [`${COMPANY.product} (${COMPANY.site}) shows what users complain about in apps, websites and SaaS products. It is made by ${COMPANY.name}, ${COMPANY.country}. We are the data controller for the data of the people who use ${COMPANY.product}. Contact: ${COMPANY.email}.`] },
		{ id: 'collect', h: 'What we collect about you', p: [
			[
				'Account: your name, email address and password (stored only as a scrambled hash). If you sign in with Google: your name, email and profile picture, nothing else.',
				'Analyses: the links you paste and the results. Your analyses are private. The products you analyse are added to the public database, but never with your name or your account: nobody can see who searched what.',
				'Claimed products: if you claim a product, the fixes you mark and the resulting fix score are shown on its public page, as “claimed by the team”, without your name.',
				'Billing: handled by Stripe. We keep your plan, its status and the Stripe customer reference. We never see or store your card number.',
				'Technical logs: time, page and errors, to keep the service secure and working.'
			]
		] },
		{ id: 'reviews', h: 'Public reviews shown on Undercut', p: [
			'The database is built from public sources: reviews on the Apple App Store and Google Play, comments on Hacker News and issues on GitHub. We store a short excerpt of each review, its date, its star rating and a link to the original. We do not store or show the name of the person who wrote it.',
			`If you wrote one of these reviews and want it removed from Undercut, write to ${COMPANY.email} with the link and we remove it.`
		] },
		{ id: 'why', h: 'Why we use it (legal bases)', p: [
			[
				'To run your account and the service you signed up for (contract).',
				'To bill you and keep accounting records (legal obligation).',
				'To keep the service secure and fix bugs (legitimate interest).',
				'To show public reviews in the database, so founders can learn from them (legitimate interest; no reviewer names are kept).'
			]
		] },
		{ id: 'emails', h: 'Emails', p: ['We send a welcome email when you sign up and the emails you ask for (password reset, receipts from Stripe). No newsletters or marketing emails without your consent.'] },
		{ id: 'share', h: 'Who we share it with', p: ['Only these service providers, under contracts that protect your data:', SUBPROCESSORS.map(([n, w, where]) => `${n}: ${w} (${where})`), 'We never sell personal data and never use it for advertising.'] },
		{ id: 'where', h: 'Where it is stored', p: ['Our server and database are in the European Union. When a provider is outside the EU, transfers are covered by the European Commission’s Standard Contractual Clauses.'] },
		{ id: 'keep', h: 'How long we keep it', p: [
			[
				'Your account and analyses: while your account exists. When you delete your account (Settings → My account), they are deleted right away; backups are overwritten within 30 days.',
				'Products added to the public database stay there, because they contain no data about you.',
				'Invoices: 7 years (Belgian accounting law).'
			]
		] },
		{ id: 'rights', h: 'Your rights', p: [`You can access, correct, export or delete your data, object to or restrict its use, and withdraw consent. You can delete your account yourself in the app, or write to ${COMPANY.email}: we answer within 30 days. You can also complain to the Belgian Data Protection Authority (dataprotectionauthority.be).`] },
		{ id: 'cookies', h: 'Cookies', p: ['We use one essential cookie to keep you signed in and one to remember your language. No advertising or tracking cookies, so there is no cookie banner.'] },
		{ id: 'changes', h: 'Changes', p: ['If we change this policy in a way that matters, we tell you by email or in the app before it applies.'] }
	];
</script>

<LegalPage title="Privacy policy" intro="The short version: we collect as little as possible, we never sell data, nobody can see what you analyse, and you can delete your account at any time." {sections} />
