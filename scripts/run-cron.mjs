// Runs the daily cron against your local server:  npm run cron
// (with the server running:  npm run dev)
const base = process.env.APP_URL || 'http://localhost:5173';
const secret = process.env.CRON_SECRET || '';
const force = process.argv.includes('--reminders') ? '?reminders=force' : '';
const res = await fetch(`${base}/api/cron/daily${force}`, {
	headers: secret ? { authorization: `Bearer ${secret}` } : {}
});
console.log(res.status, JSON.stringify(await res.json(), null, 2));
