// Which language a web page is written in, from its words (not its <html lang> tag, which templates often leave on "en").
type Lang = 'fr' | 'nl' | 'en';
const WORDS: Record<Lang, RegExp> = {
	fr: /\b(le|la|les|des|et|est|pour|vous|nous|avec|sur|une|du|au|aux|notre|votre|horaires|réserver|accueil|contactez)\b/gi,
	nl: /\b(de|het|een|en|van|voor|met|op|wij|u|uw|onze|niet|ook|openingsuren|reserveren|welkom|contacteer)\b/gi,
	en: /\b(the|and|for|you|your|our|with|we|are|this|opening|hours|book|welcome|contact us)\b/gi
};
export function textLang(html: string): Lang | null {
	const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').slice(0, 20000);
	const n = { fr: text.match(WORDS.fr)?.length ?? 0, nl: text.match(WORDS.nl)?.length ?? 0, en: text.match(WORDS.en)?.length ?? 0 };
	const best = (Object.keys(n) as Lang[]).sort((a, b) => n[b] - n[a])[0];
	const second = Math.max(...Object.values(n).filter((_, i) => (Object.keys(n) as Lang[])[i] !== best));
	return n[best] >= 15 && n[best] > second * 1.3 ? best : null;
}
