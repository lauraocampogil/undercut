// Public site texts in English, French and Spanish. The language comes from ?lang=, then a cookie, then the browser.
export type Lang = 'en' | 'fr' | 'es';
export const LANGS: Lang[] = ['en', 'fr', 'es'];

const en = {
	nav: { top: 'Top 100', how: 'How it works', founders: 'For founders', pricing: 'Pricing', openApp: 'Open the app', login: 'Log in', add: 'Add a product' },
	hero: { pill: 'Free to start · no card needed', h1a: 'See what users hate.', h1b: 'Build what they want.', sub: 'Undercut reads the App Store, Google Play, Hacker News and GitHub for any product and its competitors, and sorts what people complain about.', placeholder: 'notion.so, an App Store link, or a name', cta: 'Analyze free', products: 'products', reviews: 'reviews read', sources: 'sources' },
	marquee: 'Some of the {n} products in the database',
	top: { label: 'Top 100', title: 'The products users', muted: 'complain about most.', intro: 'Sorted by share of bad reviews. Open any product to see its complaints, its reviews and its 3 competitors. The first 15 are free.', cta: 'See the full database' },
	list: { product: 'Product', complaint: '#1 complaint', bad: 'Bad reviews', fix: 'Fix score', notClaimed: 'Not claimed', more: '{n} more products', moreText: '— unlock the full database to see every product, its complaints and its competitors.', unlock: 'Unlock the database', empty: 'The top 100 is being added. Come back in a few minutes.', hidden: 'Hidden product', hiddenComplaint: 'Hidden complaint' },
	how: {
		label: 'How it works', title: 'From a link', muted: 'to a clear answer.', intro: 'Paste a product. In about a minute you see what its users and its competitors’ users complain about. Nothing to set up.', cta: 'Analyze a product',
		steps: [
			{ title: 'Paste a product', text: 'A website, an App Store or Google Play link, or just a name. Undercut finds the product and its 3 closest competitors.' },
			{ title: 'We read what users say', text: 'The most recent reviews from the App Store and Google Play, comments from Hacker News and GitHub issues, for all four products.' },
			{ title: 'You compare by topic', text: 'Complaints and praise grouped by what people talk about, side by side. Click any number to read the reviews behind it.' }
		],
		pasteAny: 'Paste any product', found: 'Found:', reading: 'Reading reviews and posts', perTopic: 'Mentions per topic', you: 'Your app', comp: 'Competitor', analyze: 'Analyze', topics: ['Too expensive', 'Sync fails', 'Hard to use']
	},
	founders: {
		label: 'For founders', title: 'Your users complain in public.', muted: 'Answer them.', intro: 'Claim your product, mark what you fixed, and let the reviews prove it. Claiming is free.', cta: 'Claim your product',
		steps: [
			{ t: 'Claim your product', d: 'Analyze it on Undercut and click “Claim”. Its page becomes yours to answer.' },
			{ t: 'Mark every complaint', d: 'Known, Working on it or Fixed — with the date and the version. Everyone sees your answers.' },
			{ t: 'The reviews verify it', d: 'If a complaint comes up less than half as often after the fix date, the fix is verified and your score goes up.' }
		],
		gains: [
			['A better place in the top 100', 'Your fix score shows next to your product.'],
			["Your competitors' unhappy users", 'They see what you fixed that they still complain about.'],
			['A badge for your website', 'Proof, not a promise. It updates with your score.'],
			['A clear to-do list', 'Complaints sorted by how many people mention them.']
		],
		yourApp: 'Your app', meta: 'Productivity · 4 sources', isYours: 'Is it your product?', claim: 'Claim it', perWeek: '“Sync fails” per week', verified: 'Verified ✓', before: 'Before the fix', after: 'After',
		rows: [['Sync fails', 'Fixed · verified'], ['Too expensive', 'Working on it'], ['No dark mode', 'Known']]
	},
	pricing: { label: 'Pricing', title: 'One price.', muted: 'Cancel any time.', free: 'Free', freeList: ['First 15 products of the top 100', '{a} new analyses per day', 'Claim your product and get a fix score'], freeCta: 'Create an account', full: 'Full database', perMonth: '/ month', fullList: ['Every product, with complaints, reviews and competitors', '{a} new analyses per day', 'Everything in Free'], fullCta: 'Unlock the database' },
	faq: {
		label: 'Questions', title: 'Before', muted: 'you start.', anything: 'Anything else?',
		items: [
			['Where does the data come from?', 'Public reviews from the App Store and Google Play, public comments from Hacker News, and public GitHub issues for open-source products.'],
			['Can other people see what I analyze?', 'No. Products appear in the database, but nobody sees who analyzed them.'],
			['What is the fix score?', 'A team that claims its product can mark complaints as fixed. If that complaint comes up less than half as often after the fix date, the fix counts as verified. The fix score is the share of complaints fixed and verified.'],
			['What do I get for free?', 'The first 15 products of the top 100, {a} new analyses per day, and you can claim your own product.'],
			['Can I cancel?', 'Yes, any time, from your account.']
		]
	},
	footer: { title: 'Stop guessing', muted: 'what users want.', cta: 'Analyze a product', tagline: 'The database of what users hate.', product: 'Product', account: 'Account', contact: 'Contact', signup: 'Sign up', login: 'Log in', privacy: 'Privacy', terms: 'Terms' },
	mock: { you: 'Your app', vs: 'vs 3 competitors · 412 reviews', byTheme: 'By theme', all: 'All reviews', complaint: 'Complaint', rows: ['Too expensive', 'Sync fails', 'Hard to use', 'Slow on Android'], quote: '“Great idea, but it costs too much for what it does.”', topic: 'Topic: Too expensive', fix: 'Fix score', month: 'Example' },
	meta: { title: 'Undercut — The database of what users hate', desc: 'The top 100 apps and SaaS and what their users complain about on the App Store, Google Play, Hacker News and GitHub — compared with their competitors.' }
};
type Dict = typeof en;

const fr: Dict = {
	nav: { top: 'Top 100', how: 'Comment ça marche', founders: 'Pour les fondateurs', pricing: 'Tarifs', openApp: 'Ouvrir l’app', login: 'Se connecter', add: 'Ajouter un produit' },
	hero: { pill: 'Gratuit pour commencer · sans carte', h1a: 'Voyez ce que les utilisateurs détestent.', h1b: 'Construisez ce qu’ils veulent.', sub: 'Undercut lit l’App Store, Google Play, Hacker News et GitHub pour n’importe quel produit et ses concurrents, et trie ce dont les gens se plaignent.', placeholder: 'notion.so, un lien App Store ou un nom', cta: 'Analyser gratuitement', products: 'produits', reviews: 'avis lus', sources: 'sources' },
	marquee: 'Quelques-uns des {n} produits de la base',
	top: { label: 'Top 100', title: 'Les produits dont les utilisateurs', muted: 'se plaignent le plus.', intro: 'Classés par part d’avis négatifs. Ouvrez un produit pour voir ses plaintes, ses avis et ses 3 concurrents. Les 15 premiers sont gratuits.', cta: 'Voir toute la base' },
	list: { product: 'Produit', complaint: 'Plainte n°1', bad: 'Avis négatifs', fix: 'Score de correction', notClaimed: 'Non revendiqué', more: '{n} produits de plus', moreText: '— débloquez la base complète pour voir chaque produit, ses plaintes et ses concurrents.', unlock: 'Débloquer la base', empty: 'Le top 100 est en cours d’ajout. Revenez dans quelques minutes.', hidden: 'Produit masqué', hiddenComplaint: 'Plainte masquée' },
	how: {
		label: 'Comment ça marche', title: 'D’un lien', muted: 'à une réponse claire.', intro: 'Collez un produit. En une minute environ, vous voyez de quoi se plaignent ses utilisateurs et ceux de ses concurrents. Rien à configurer.', cta: 'Analyser un produit',
		steps: [
			{ title: 'Collez un produit', text: 'Un site, un lien App Store ou Google Play, ou simplement un nom. Undercut trouve le produit et ses 3 concurrents les plus proches.' },
			{ title: 'On lit ce que disent les utilisateurs', text: 'Les avis les plus récents de l’App Store et de Google Play, les commentaires de Hacker News et les issues GitHub, pour les quatre produits.' },
			{ title: 'Vous comparez par sujet', text: 'Plaintes et compliments regroupés par sujet, côte à côte. Cliquez sur un chiffre pour lire les avis derrière.' }
		],
		pasteAny: 'Collez n’importe quel produit', found: 'Trouvés :', reading: 'Lecture des avis et des posts', perTopic: 'Mentions par sujet', you: 'Votre app', comp: 'Concurrent', analyze: 'Analyser', topics: ['Trop cher', 'Sync en panne', 'Difficile à utiliser']
	},
	founders: {
		label: 'Pour les fondateurs', title: 'Vos utilisateurs se plaignent en public.', muted: 'Répondez-leur.', intro: 'Revendiquez votre produit, indiquez ce que vous avez corrigé et laissez les avis le prouver. C’est gratuit.', cta: 'Revendiquer mon produit',
		steps: [
			{ t: 'Revendiquez votre produit', d: 'Analysez-le sur Undercut et cliquez sur « Revendiquer ». Sa page devient la vôtre.' },
			{ t: 'Indiquez chaque plainte', d: 'Connu, En cours ou Corrigé — avec la date et la version. Tout le monde voit vos réponses.' },
			{ t: 'Les avis le vérifient', d: 'Si une plainte revient deux fois moins souvent après la date de correction, elle est vérifiée et votre score monte.' }
		],
		gains: [
			['Une meilleure place dans le top 100', 'Votre score de correction s’affiche à côté de votre produit.'],
			['Les utilisateurs déçus de vos concurrents', 'Ils voient ce que vous avez corrigé et dont ils se plaignent encore.'],
			['Un badge pour votre site', 'Une preuve, pas une promesse. Il suit votre score.'],
			['Une liste de tâches claire', 'Les plaintes triées selon le nombre de personnes qui en parlent.']
		],
		yourApp: 'Votre app', meta: 'Productivité · 4 sources', isYours: 'C’est votre produit ?', claim: 'Revendiquer', perWeek: '« Sync en panne » par semaine', verified: 'Vérifié ✓', before: 'Avant la correction', after: 'Après',
		rows: [['Sync en panne', 'Corrigé · vérifié'], ['Trop cher', 'En cours'], ['Pas de mode sombre', 'Connu']]
	},
	pricing: { label: 'Tarifs', title: 'Un seul prix.', muted: 'Résiliable à tout moment.', free: 'Gratuit', freeList: ['Les 15 premiers produits du top 100', '{a} nouvelles analyses par jour', 'Revendiquez votre produit et obtenez un score'], freeCta: 'Créer un compte', full: 'Base complète', perMonth: '/ mois', fullList: ['Tous les produits, avec plaintes, avis et concurrents', '{a} nouvelles analyses par jour', 'Tout ce qui est dans Gratuit'], fullCta: 'Débloquer la base' },
	faq: {
		label: 'Questions', title: 'Avant', muted: 'de commencer.', anything: 'Autre chose ?',
		items: [
			['D’où viennent les données ?', 'Des avis publics de l’App Store et de Google Play, des commentaires publics de Hacker News, et les issues GitHub publiques des produits open source.'],
			['Les autres peuvent-ils voir ce que j’analyse ?', 'Non. Les produits apparaissent dans la base, mais personne ne voit qui les a analysés.'],
			['Qu’est-ce que le score de correction ?', 'Une équipe qui revendique son produit peut marquer des plaintes comme corrigées. Si la plainte revient deux fois moins souvent après la date de correction, elle est vérifiée. Le score est la part des plaintes corrigées et vérifiées.'],
			['Qu’ai-je gratuitement ?', 'Les 15 premiers produits du top 100, {a} nouvelles analyses par jour, et vous pouvez revendiquer votre produit.'],
			['Puis-je résilier ?', 'Oui, à tout moment, depuis votre compte.']
		]
	},
	footer: { title: 'Arrêtez de deviner', muted: 'ce que veulent vos utilisateurs.', cta: 'Analyser un produit', tagline: 'La base de ce que les utilisateurs détestent.', product: 'Produit', account: 'Compte', contact: 'Contact', signup: 'Créer un compte', login: 'Se connecter', privacy: 'Confidentialité', terms: 'Conditions' },
	mock: { you: 'Votre app', vs: 'vs 3 concurrents · 412 avis', byTheme: 'Par sujet', all: 'Tous les avis', complaint: 'Plainte', rows: ['Trop cher', 'Sync en panne', 'Difficile à utiliser', 'Lent sur Android'], quote: '« Bonne idée, mais trop cher pour ce que ça fait. »', topic: 'Sujet : Trop cher', fix: 'Score de correction', month: 'Exemple' },
	meta: { title: 'Undercut — La base de ce que les utilisateurs détestent', desc: 'Le top 100 des apps et SaaS et ce dont leurs utilisateurs se plaignent sur l’App Store, Google Play, Hacker News et GitHub — comparés à leurs concurrents.' }
};

const es: Dict = {
	nav: { top: 'Top 100', how: 'Cómo funciona', founders: 'Para fundadores', pricing: 'Precios', openApp: 'Abrir la app', login: 'Iniciar sesión', add: 'Añadir un producto' },
	hero: { pill: 'Gratis para empezar · sin tarjeta', h1a: 'Mira lo que odian los usuarios.', h1b: 'Construye lo que quieren.', sub: 'Undercut lee el App Store, Google Play, Hacker News y GitHub de cualquier producto y sus competidores, y ordena de qué se queja la gente.', placeholder: 'notion.so, un enlace del App Store o un nombre', cta: 'Analizar gratis', products: 'productos', reviews: 'reseñas leídas', sources: 'fuentes' },
	marquee: 'Algunos de los {n} productos de la base de datos',
	top: { label: 'Top 100', title: 'Los productos de los que', muted: 'más se quejan los usuarios.', intro: 'Ordenados por porcentaje de malas reseñas. Abre un producto para ver sus quejas, sus reseñas y sus 3 competidores. Los 15 primeros son gratis.', cta: 'Ver toda la base de datos' },
	list: { product: 'Producto', complaint: 'Queja n.º 1', bad: 'Malas reseñas', fix: 'Arreglos', notClaimed: 'Sin reclamar', more: '{n} productos más', moreText: '— desbloquea la base de datos completa para ver cada producto, sus quejas y sus competidores.', unlock: 'Desbloquear la base de datos', empty: 'Estamos añadiendo el top 100. Vuelve en unos minutos.', hidden: 'Producto oculto', hiddenComplaint: 'Queja oculta' },
	how: {
		label: 'Cómo funciona', title: 'De un enlace', muted: 'a una respuesta clara.', intro: 'Pega un producto. En un minuto ves de qué se quejan sus usuarios y los de sus competidores. Sin configurar nada.', cta: 'Analizar un producto',
		steps: [
			{ title: 'Pega un producto', text: 'Una web, un enlace del App Store o de Google Play, o solo un nombre. Undercut encuentra el producto y sus 3 competidores más cercanos.' },
			{ title: 'Leemos lo que dicen los usuarios', text: 'Las reseñas más recientes del App Store y Google Play, comentarios de Hacker News e issues de GitHub, para los cuatro productos.' },
			{ title: 'Comparas por tema', text: 'Quejas y elogios agrupados por tema, lado a lado. Haz clic en un número para leer las reseñas que hay detrás.' }
		],
		pasteAny: 'Pega cualquier producto', found: 'Encontrados:', reading: 'Leyendo reseñas y posts', perTopic: 'Menciones por tema', you: 'Tu app', comp: 'Competidor', analyze: 'Analizar', topics: ['Demasiado caro', 'Falla la sincronización', 'Difícil de usar']
	},
	founders: {
		label: 'Para fundadores', title: 'Tus usuarios se quejan en público.', muted: 'Respóndeles.', intro: 'Reclama tu producto, marca lo que has arreglado y deja que las reseñas lo demuestren. Reclamarlo es gratis.', cta: 'Reclamar mi producto',
		steps: [
			{ t: 'Reclama tu producto', d: 'Analízalo en Undercut y pulsa «Reclamar». Su página pasa a ser tuya.' },
			{ t: 'Marca cada queja', d: 'Conocido, En ello o Arreglado — con la fecha y la versión. Todo el mundo ve tus respuestas.' },
			{ t: 'Las reseñas lo verifican', d: 'Si una queja aparece menos de la mitad de veces después de la fecha del arreglo, queda verificado y tu puntuación sube.' }
		],
		gains: [
			['Mejor puesto en el top 100', 'Tu puntuación de arreglos aparece junto a tu producto.'],
			['Los usuarios descontentos de tu competencia', 'Ven lo que tú arreglaste y de lo que ellos aún se quejan.'],
			['Un badge para tu web', 'Una prueba, no una promesa. Se actualiza con tu puntuación.'],
			['Una lista de tareas clara', 'Quejas ordenadas por cuánta gente las menciona.']
		],
		yourApp: 'Tu app', meta: 'Productividad · 4 fuentes', isYours: '¿Es tu producto?', claim: 'Reclamar', perWeek: '«Falla la sincronización» por semana', verified: 'Verificado ✓', before: 'Antes del arreglo', after: 'Después',
		rows: [['Falla la sincronización', 'Arreglado · verificado'], ['Demasiado caro', 'En ello'], ['Sin modo oscuro', 'Conocido']]
	},
	pricing: { label: 'Precios', title: 'Un solo precio.', muted: 'Cancela cuando quieras.', free: 'Gratis', freeList: ['Los 15 primeros productos del top 100', '{a} análisis nuevos al día', 'Reclama tu producto y consigue una puntuación'], freeCta: 'Crear una cuenta', full: 'Base de datos completa', perMonth: '/ mes', fullList: ['Todos los productos, con quejas, reseñas y competidores', '{a} análisis nuevos al día', 'Todo lo del plan gratis'], fullCta: 'Desbloquear la base de datos' },
	faq: {
		label: 'Preguntas', title: 'Antes', muted: 'de empezar.', anything: '¿Algo más?',
		items: [
			['¿De dónde salen los datos?', 'De reseñas públicas del App Store y Google Play, comentarios públicos de Hacker News e issues públicas de GitHub de los productos de código abierto.'],
			['¿Pueden otros ver lo que analizo?', 'No. Los productos aparecen en la base de datos, pero nadie ve quién los analizó.'],
			['¿Qué es la puntuación de arreglos?', 'Un equipo que reclama su producto puede marcar quejas como arregladas. Si esa queja aparece menos de la mitad de veces después de la fecha del arreglo, cuenta como verificado. La puntuación es el porcentaje de quejas arregladas y verificadas.'],
			['¿Qué tengo gratis?', 'Los 15 primeros productos del top 100, {a} análisis nuevos al día, y puedes reclamar tu producto.'],
			['¿Puedo cancelar?', 'Sí, cuando quieras, desde tu cuenta.']
		]
	},
	footer: { title: 'Deja de adivinar', muted: 'lo que quieren tus usuarios.', cta: 'Analizar un producto', tagline: 'La base de datos de lo que odian los usuarios.', product: 'Producto', account: 'Cuenta', contact: 'Contacto', signup: 'Crear cuenta', login: 'Iniciar sesión', privacy: 'Privacidad', terms: 'Condiciones' },
	mock: { you: 'Tu app', vs: 'vs 3 competidores · 412 reseñas', byTheme: 'Por tema', all: 'Todas las reseñas', complaint: 'Queja', rows: ['Demasiado caro', 'Falla la sincronización', 'Difícil de usar', 'Lento en Android'], quote: '«Buena idea, pero cuesta demasiado para lo que hace.»', topic: 'Tema: Demasiado caro', fix: 'Arreglos', month: 'Ejemplo' },
	meta: { title: 'Undercut — La base de datos de lo que odian los usuarios', desc: 'El top 100 de apps y SaaS y de qué se quejan sus usuarios en el App Store, Google Play, Hacker News y GitHub — comparados con sus competidores.' }
};

export const SITE: Record<Lang, Dict> = { en, fr, es };
export type SiteDict = Dict;
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

/** Pick the language: ?lang= (remembered in a cookie), then the cookie, then the browser. */
export function pickLang(url: URL, cookie: string | undefined, accept: string | null): Lang {
	const q = url.searchParams.get('lang');
	if (q && LANGS.includes(q as Lang)) return q as Lang;
	if (cookie && LANGS.includes(cookie as Lang)) return cookie as Lang;
	const first = (accept ?? '')
		.toLowerCase()
		.split(',')
		.map((x) => x.trim().slice(0, 2))
		.find((x) => LANGS.includes(x as Lang));
	return (first as Lang) ?? 'en';
}
