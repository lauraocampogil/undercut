// Undercut prices and limits — change them here, they show on the pricing section and are enforced on analyses.
export const PRICE = {
	full: '€49/mo', // full database (change when the Stripe price is created)
	freeAnalyses: 3, // new analyses per day, free accounts
	paidAnalyses: 10, // new analyses per day, full database (each new one costs AI)
	founder: '€29/mo', // founding price for the first people on the waitlist
	freeSeats: 20, // the first people who confirm their email: free during the beta
	founderSeats: 30, // the next ones: founding price
	openAt: 50 // waitlist answers needed before opening
};
