<script lang="ts">
	import LegalPage from '#lib/components/LegalPage.svelte';
	import { COMPANY, SUBPROCESSORS } from '#lib/legal.ts';
	const sections = [
		{ id: 'scope', h: 'Scope and roles', p: [`This Data processing agreement (DPA) is part of the Terms of service. When you use ${COMPANY.product} for your clients (snippet, connected Google accounts, app SDK), your agency — or your client — is the controller, and ${COMPANY.name} is the processor (article 28 GDPR). It applies automatically; no signature is needed.`] },
		{ id: 'what', h: 'What we process', p: [
			[
				'Subject matter: measuring and improving your clients’ websites and apps.',
				'Data: page views, clicks and scroll depth, leads (type of contact, page, source), country, device type, app events and crash reports, data from connected Google services.',
				'People concerned: visitors of your clients’ websites and users of their apps.',
				'Duration: as long as the client is in your workspace, then deletion within 30 days.'
			],
			'No IP addresses, no cookies, no form contents and no special categories of data are collected by the snippet.'
		] },
		{ id: 'commit', h: 'Our commitments', p: [
			[
				'Process the data only on your documented instructions (using the service as designed is that instruction).',
				'Make sure everyone with access is bound by confidentiality.',
				'Protect the data: encryption in transit (HTTPS), access control per workspace, hashed passwords, daily backups, EU hosting.',
				'Help you answer people’s requests and with security or impact assessments when needed.',
				'Tell you without undue delay, and within 48 hours, if a personal data breach affects your data.',
				'Delete or return the data when the contract ends.',
				'Give you the information needed to show compliance, and allow reasonable audits with notice.'
			]
		] },
		{ id: 'sub', h: 'Sub-processors', p: ['You authorise the sub-processors below. We will announce any new one at least 30 days in advance; you can object, and if we can’t find a solution you can end the contract.'] },
		{ id: 'transfers', h: 'International transfers', p: ['When a sub-processor is outside the EU, transfers rely on the European Commission’s Standard Contractual Clauses and additional measures where needed.'] },
		{ id: 'contact', h: 'Contact', p: [`For anything about data protection: ${COMPANY.email}.`] }
	];
</script>

<LegalPage title="Data processing agreement" intro="How we handle your clients’ visitors’ data when we process it on your behalf — written to be understood, compliant with article 28 GDPR." {sections}>
	<div class="mt-12 overflow-hidden rounded-[20px] bg-white/60 shadow-[0_0_0_1px_rgba(0,0,0,.06)]">
		<table class="w-full text-left text-sm">
			<thead class="text-xs text-muted"><tr><th class="p-4 font-medium">Sub-processor</th><th class="p-4 font-medium">Purpose</th><th class="hidden p-4 font-medium sm:table-cell">Location</th></tr></thead>
			<tbody>
				{#each SUBPROCESSORS as [n, p, l] (n)}<tr class="border-t border-black/[.06] align-top"><td class="p-4 font-medium">{n}</td><td class="p-4 text-ink-2">{p}</td><td class="hidden p-4 text-ink-2 sm:table-cell">{l}</td></tr>{/each}
			</tbody>
		</table>
	</div>
</LegalPage>
