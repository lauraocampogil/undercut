<script lang="ts">
	import LegalPage from '#lib/components/LegalPage.svelte';
	import { COMPANY } from '#lib/legal.ts';
	const sections = [
		{ id: 'who', h: 'Who we are', p: [`${COMPANY.product} is a dashboard for agencies, made by ${COMPANY.name} (${COMPANY.country}). For the data of agencies that use ${COMPANY.product} (accounts, billing, your agency profile, your prospects list), we are the data controller. For the data collected on your clients’ websites and apps, your agency is the controller and we are your processor — see the Data processing agreement.`] },
		{ id: 'collect', h: 'What we collect', p: [
			[
				'Account: name, email address, password (stored only as a hash), role, workspace.',
				'Agency profile: the URL you paste, what we read on that public page (name, services, city, language, brand colour).',
				'Prospects: public business listings from OpenStreetMap (name, category, address, website, phone when published) and what we observe on their public website (speed, mobile, https, last update).',
				'Connected services: when you connect Google, we store access tokens to read the Analytics, Search Console, Business Profile and Tag Manager data you choose. We only request the scopes needed and never sell or share this data.',
				'Billing: handled by Stripe. We keep the plan, status and invoice references, never your full card number.',
				'Usage: basic logs (time, page, errors) to keep the service secure and working.'
			]
		] },
		{ id: 'clients', h: 'Data on your clients’ websites and apps', p: [
			'The Undercut snippet is cookieless. It records page views, clicks and scroll depth for heatmaps, leads (form submitted, phone, email or WhatsApp click), the traffic source and the visitor’s country. It does not store IP addresses, does not use cookies or fingerprinting, and never records what people type in forms.',
			'A random session identifier lives only in the visitor’s browser tab (sessionStorage) and disappears when the tab closes.'
		] },
		{ id: 'why', h: 'Why we use it (legal bases)', p: [
			[
				'To provide the service you signed up for (contract).',
				'To bill you and keep accounting records (legal obligation).',
				'To keep the service secure, fix bugs and improve it (legitimate interest).',
				'To find prospects from public business listings, so agencies can offer them a service (legitimate interest). Undercut never contacts businesses itself: you review and send each message.',
				'To send product emails you can turn off at any time (consent or legitimate interest, depending on the email).'
			]
		] },
		{ id: 'prospects', h: 'If you are a business listed as a prospect', p: [
			`We only use information that you or your business made public (your OpenStreetMap listing and your public website). We keep it to show it to agencies looking for clients nearby. You can ask us at any time to remove your business so it never appears again: write to ${COMPANY.email} with your business name and address.`
		] },
		{ id: 'share', h: 'Who we share it with', p: ['Only the service providers listed in our Data processing agreement (hosting, database, email, payments, Google APIs, AI and map services), under contracts that protect your data. We never sell personal data and never use it for advertising.'] },
		{ id: 'ai', h: 'AI features', p: ['Some features (summaries, suggested fixes, first messages) send the minimum needed text to an AI provider. That provider does not use it to train its models.'] },
		{ id: 'where', h: 'Where it is stored', p: ['Our servers and database are in the European Union. When a provider is outside the EU, transfers are covered by the European Commission’s Standard Contractual Clauses.'] },
		{ id: 'keep', h: 'How long we keep it', p: [
			[
				'Account and workspace data: while your account is active, then deleted within 30 days after you close it.',
				'Website events from the snippet: 13 months, then deleted or aggregated.',
				'Invoices: 7 years (Belgian accounting law).',
				'Prospects you did not keep: removed from your list when you delete them; public listing caches are refreshed regularly.'
			]
		] },
		{ id: 'rights', h: 'Your rights', p: [`You can ask to access, correct, delete or export your data, object to or restrict its use, and withdraw consent. Write to ${COMPANY.email} — we answer within 30 days. You can also complain to the Belgian Data Protection Authority (dataprotectionauthority.be).`] },
		{ id: 'cookies', h: 'Cookies', p: ['On getundercut.app we only use one essential cookie to keep you signed in. No advertising or tracking cookies, so there is no cookie banner.'] },
		{ id: 'changes', h: 'Changes', p: ['If we change this policy in a way that matters, we tell you by email or in the app before it applies.'] }
	];
</script>

<LegalPage title="Privacy policy" intro="The short version: we collect as little as possible, we never sell data, the snippet on your clients’ sites uses no cookies, and you can delete everything at any time." {sections} />
