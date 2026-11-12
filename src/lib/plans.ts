export const PLANS = {
	trial: { name: 'Free trial', price: 0, clients: 10, ai: 100 },
	freelance: { name: 'Freelance', price: 19, clients: 3, ai: 200 },
	agency: { name: 'Agency', price: 59, clients: 15, ai: 1000 },
	studio: { name: 'Studio', price: 149, clients: 50, ai: 5000 }
} as const;
export type PlanId = keyof typeof PLANS;
