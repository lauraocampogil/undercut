// Plan ids are kept for compatibility (freelance / agency / studio); names and limits follow the current offer.
export const PLANS = {
	trial: { name: 'Free trial', price: 0, clients: 10, ai: 100, prospects: 100 },
	freelance: { name: 'Solo', price: 15, clients: 10, ai: 200, prospects: 50 },
	agency: { name: 'Studio', price: 49, clients: 50, ai: 1000, prospects: 200 },
	studio: { name: 'Agency', price: 99, clients: 50, ai: 5000, prospects: 1000 },
	full: { name: 'Full database', price: 49, clients: 50, ai: 1000, prospects: 0 }
} as const;
export type PlanId = keyof typeof PLANS;
