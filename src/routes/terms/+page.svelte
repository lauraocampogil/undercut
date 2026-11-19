<script lang="ts">
	import LegalPage from '#lib/components/LegalPage.svelte';
	import { COMPANY } from '#lib/legal.ts';
	const sections = [
		{ id: 'agree', h: 'Agreement', p: [`These terms are a contract between you (the agency or freelancer using ${COMPANY.product}) and ${COMPANY.name}. By creating an account you accept them. ${COMPANY.product} is for professional use only.`] },
		{ id: 'service', h: 'The service', p: [`${COMPANY.product} gives you a dashboard to find prospects, follow them in a pipeline and monitor your clients’ websites and apps (leads, traffic, search, speed, fixes, reports). We improve it continuously and may change features; if we remove something essential you pay for, we tell you in advance.`] },
		{ id: 'account', h: 'Your account', p: ['Keep your password safe and tell us about any unauthorised use. You are responsible for what happens in your workspace, including what team members and client logins do.'] },
		{ id: 'prospecting', h: 'Prospecting rules', p: [
			'Undercut finds businesses from public listings and drafts a first message. You decide whether to contact them, and you send every message yourself. You agree to:',
			[
				'contact businesses in a professional, relevant way, and respect anti-spam and privacy laws where you and they are located (for example GDPR and ePrivacy in the EU);',
				'stop contacting anyone who asks you to, and never resell or publish prospect lists;',
				'not use Undercut for mass unsolicited email.'
			]
		] },
		{ id: 'clients', h: 'Your clients’ websites and apps', p: ['You confirm you have your clients’ permission to install the snippet, connect their Google accounts and publish fixes on their sites. You are the controller of their visitors’ data; we process it for you under the Data processing agreement. Fixes published through the snippet are visible on the live site: review them before approving.'] },
		{ id: 'pay', h: 'Plans, trial and payment', p: [
			[
				'A free trial lets you try Undercut; it ends automatically and nothing is charged unless you choose a plan.',
				'Paid plans are billed monthly in advance through Stripe, prices excluding VAT. You can cancel any time; your plan stays active until the end of the paid month. No refunds for partial months, except where the law requires.',
				'Founding offer: the first 30 agencies keep −50% for as long as their subscription stays active without interruption.',
				'We can change prices with at least 30 days’ notice; the new price applies from your next billing period.'
			]
		] },
		{ id: 'use', h: 'Fair use', p: ['Don’t break the law with Undercut, don’t try to access other workspaces, overload the service, reverse-engineer it or resell it. We may suspend an account that does, after warning you when possible.'] },
		{ id: 'data', h: 'Your data', p: ['Your data stays yours. You can export it and delete your workspace at any time. After closing your account we delete your data within 30 days, except invoices we must keep by law.'] },
		{ id: 'availability', h: 'Availability', p: ['We work hard to keep Undercut available and your data safe, with daily backups, but we can’t promise it will never be interrupted. Data from third parties (Google, OpenStreetMap, app stores) can be delayed or incomplete.'] },
		{ id: 'liability', h: 'Liability', p: ['Undercut gives information and suggestions; business decisions stay yours. To the extent allowed by law, our total liability is limited to what you paid us in the 12 months before the claim, and we are not liable for indirect losses such as lost profit or lost clients. Nothing limits liability for fraud or gross negligence.'] },
		{ id: 'end', h: 'Ending the contract', p: ['You can stop at any time from your account settings. We can end the contract with 30 days’ notice, or immediately if these terms are seriously breached.'] },
		{ id: 'law', h: 'Law and disputes', p: [`Belgian law applies. We’ll first try to solve any problem together — write to ${COMPANY.email}. Otherwise, the courts of Brussels have jurisdiction.`] }
	];
</script>

<LegalPage title="Terms of service" intro="Plain-language terms for agencies and freelancers using Undercut. The main ideas: you send your own messages, you own your data, you can cancel any time." {sections} />
