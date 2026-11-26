// Waitlist survey texts (en / fr / es). Option values are stable English keys; only the labels are translated.
import type { Lang } from './site-i18n.ts';

type Opt = [key: string, label: string];
export type WaitDict = {
	title: string; sub: string; perks: string[]; steps: string[];
	email: string; name: string; next: string; back: string; send: string; sending: string; required: string;
	role: string; roles: Opt[]; building: string; buildingPh: string; stage: string; stages: Opt[]; type: string; types: Opt[];
	today: string; todays: Opt[]; todayOther: string; paid: string; paidPh: string; pain: string; painPh: string;
	jobs: string; jobsHint: string; jobList: Opt[]; sources: string; sourceList: Opt[]; feature: string; featurePh: string;
	pay: string; pays: Opt[]; price: string; pricePh: string; other: string; otherPh: string;
	doneTitle: string; progress: string; founder: string; regular: string; place: string; of: string; moveUp: string; copy: string; copied: string; friends: string; tryNow: string; privacy: string; beta: string;
};

const en: WaitDict = {
	title: 'Get early access to Undercut',
	sub: 'Undercut reads thousands of public reviews and shows what users hate about any app, website or SaaS, next to its competitors. Join the list and tell us what you need: your answers decide what we build first.',
	perks: ['The first 20 use it free for life, the next 30 get a free month then €29/month instead of €49', 'Your feature requests go first', 'Early access before everyone else'],
	steps: ['You', 'What you build', 'How you do it today', 'What you need'],
	email: 'Email', name: 'First name', next: 'Continue', back: 'Back', send: 'Join the waitlist', sending: 'Joining…', required: 'Required',
	role: 'What describes you best?',
	roles: [['indie', 'Solo / indie founder'], ['startup', 'Founder of a startup with a team'], ['pm', 'Product manager'], ['dev', 'Developer'], ['designer', 'Designer'], ['marketing', 'Marketer / growth'], ['agency', 'Agency or freelancer'], ['investor', 'Investor'], ['other', 'Other']],
	building: 'What are you building?', buildingPh: 'A link, or one line: “a budgeting app for students”',
	stage: 'Where is it today?',
	stages: [['idea', 'Just an idea'], ['building', 'Building it'], ['launched', 'Launched, no revenue yet'], ['revenue', 'Making revenue'], ['none', 'I’m not building anything']],
	type: 'What kind of product?',
	types: [['mobile', 'Mobile app'], ['saas', 'SaaS / web app'], ['website', 'Website or content'], ['ecommerce', 'E-commerce'], ['other', 'Other']],
	today: 'How do you find out what users dislike today?',
	todays: [['stores', 'I read App Store / Google Play reviews by hand'], ['reddit', 'Reddit, X or forums'], ['support', 'Support tickets and emails'], ['surveys', 'Surveys or interviews'], ['analytics', 'Analytics and session replays'], ['tool', 'A paid tool'], ['nothing', 'I don’t really do it']],
	todayOther: 'Anything else?',
	paid: 'Do you pay for a tool for this today? Which one, and how much?', paidPh: 'No / AppFollow, €… / …',
	pain: 'What is the hardest or most annoying part?', painPh: 'Too many reviews to read, hard to compare with competitors, no time…',
	jobs: 'What would you use Undercut for?', jobsHint: 'Pick up to 3',
	jobList: [['validate', 'Validate a new idea before building'], ['gaps', 'Find what competitors’ users hate, to do better'], ['roadmap', 'Decide what to fix or build next'], ['copy', 'Write marketing that speaks to real pain'], ['show', 'Show users what I fixed (fix score, badge)'], ['research', 'Market or investment research'], ['monitor', 'Watch my own reviews over time']],
	sources: 'Which sources matter most to you?',
	sourceList: [['appstore', 'App Store'], ['googleplay', 'Google Play'], ['reddit', 'Reddit'], ['g2', 'G2 / Capterra'], ['trustpilot', 'Trustpilot'], ['hn', 'Hacker News'], ['github', 'GitHub issues'], ['x', 'X / Twitter'], ['producthunt', 'Product Hunt'], ['youtube', 'YouTube comments']],
	feature: 'If Undercut did one thing perfectly for you, what would it be?', featurePh: 'Weekly alert when a competitor gets bad reviews, export to Notion…',
	pay: 'Would you pay €49 a month for the full database?',
	pays: [['yes', 'Yes, today'], ['yes-if', 'Yes, if it did what I wrote above'], ['lower', 'Only at a lower price'], ['team', 'My company would pay'], ['no', 'No']],
	price: 'What price would feel fair to you?', pricePh: '€… / month',
	other: 'Anything else we should know?', otherPh: 'Optional',
	progress: '{n} of {max} answers. We open Undercut when we reach {max}.', founder: 'The first 20 who confirm their email use Undercut free for life. The next 30 get the first month free, then €29/month instead of €49.', regular: 'The first 20 who confirm use it free for life, the next 30 get a free month then €29/month. After that: €49/month.',
	doneTitle: 'You’re on the list', place: 'Your place', of: 'of', moveUp: 'Move up 5 places for every friend who joins with your link.', copy: 'Copy my link', copied: 'Copied', friends: 'friends joined with your link', tryNow: 'Try a free analysis now', privacy: 'We only use your email to tell you when you’re in. No spam, unsubscribe anytime.', beta: 'Check your email and click “Confirm my email”: your seat is given when you confirm, and you go straight to your account.'
};

const fr: WaitDict = {
	title: 'Accédez à Undercut en avant-première',
	sub: 'Undercut lit des milliers d’avis publics et montre ce que les utilisateurs détestent dans n’importe quelle app, site ou SaaS, à côté de ses concurrents. Inscrivez-vous et dites-nous ce dont vous avez besoin : vos réponses décident de ce qu’on construit en premier.',
	perks: ['Les 20 premiers l’utilisent gratuitement à vie, les 30 suivants ont un mois offert puis 29 €/mois au lieu de 49 €', 'Vos demandes passent en premier', 'Accès avant tout le monde'],
	steps: ['Vous', 'Votre produit', 'Aujourd’hui', 'Vos besoins'],
	email: 'Email', name: 'Prénom', next: 'Continuer', back: 'Retour', send: 'Rejoindre la liste', sending: 'Inscription…', required: 'Obligatoire',
	role: 'Qu’est-ce qui vous décrit le mieux ?',
	roles: [['indie', 'Fondateur solo / indie'], ['startup', 'Fondateur d’une startup avec une équipe'], ['pm', 'Product manager'], ['dev', 'Développeur'], ['designer', 'Designer'], ['marketing', 'Marketing / growth'], ['agency', 'Agence ou freelance'], ['investor', 'Investisseur'], ['other', 'Autre']],
	building: 'Que construisez-vous ?', buildingPh: 'Un lien, ou une ligne : « une app de budget pour étudiants »',
	stage: 'Où en êtes-vous ?',
	stages: [['idea', 'Juste une idée'], ['building', 'En construction'], ['launched', 'Lancé, pas encore de revenus'], ['revenue', 'Je fais du chiffre'], ['none', 'Je ne construis rien']],
	type: 'Quel type de produit ?',
	types: [['mobile', 'App mobile'], ['saas', 'SaaS / app web'], ['website', 'Site ou contenu'], ['ecommerce', 'E-commerce'], ['other', 'Autre']],
	today: 'Comment savez-vous aujourd’hui ce que vos utilisateurs n’aiment pas ?',
	todays: [['stores', 'Je lis les avis App Store / Google Play à la main'], ['reddit', 'Reddit, X ou forums'], ['support', 'Tickets et emails du support'], ['surveys', 'Sondages ou entretiens'], ['analytics', 'Analytics et replays de sessions'], ['tool', 'Un outil payant'], ['nothing', 'Je ne le fais pas vraiment']],
	todayOther: 'Autre chose ?',
	paid: 'Payez-vous un outil pour ça ? Lequel, et combien ?', paidPh: 'Non / AppFollow, … € / …',
	pain: 'Quelle est la partie la plus difficile ou pénible ?', painPh: 'Trop d’avis à lire, difficile de comparer avec les concurrents, pas le temps…',
	jobs: 'Pour quoi utiliseriez-vous Undercut ?', jobsHint: 'Jusqu’à 3 choix',
	jobList: [['validate', 'Valider une idée avant de la construire'], ['gaps', 'Voir ce que les utilisateurs des concurrents détestent'], ['roadmap', 'Décider quoi corriger ou construire ensuite'], ['copy', 'Écrire un marketing qui parle des vrais problèmes'], ['show', 'Montrer ce que j’ai corrigé (score, badge)'], ['research', 'Étude de marché ou d’investissement'], ['monitor', 'Suivre mes propres avis dans le temps']],
	sources: 'Quelles sources comptent le plus pour vous ?',
	sourceList: [['appstore', 'App Store'], ['googleplay', 'Google Play'], ['reddit', 'Reddit'], ['g2', 'G2 / Capterra'], ['trustpilot', 'Trustpilot'], ['hn', 'Hacker News'], ['github', 'Issues GitHub'], ['x', 'X / Twitter'], ['producthunt', 'Product Hunt'], ['youtube', 'Commentaires YouTube']],
	feature: 'Si Undercut faisait une seule chose parfaitement pour vous, ce serait quoi ?', featurePh: 'Alerte hebdo quand un concurrent reçoit de mauvais avis, export Notion…',
	pay: 'Paieriez-vous 49 € par mois pour la base complète ?',
	pays: [['yes', 'Oui, dès aujourd’hui'], ['yes-if', 'Oui, si elle faisait ce que j’ai écrit'], ['lower', 'Seulement à un prix plus bas'], ['team', 'Mon entreprise paierait'], ['no', 'Non']],
	price: 'Quel prix vous semblerait juste ?', pricePh: '… € / mois',
	other: 'Autre chose à nous dire ?', otherPh: 'Facultatif',
	progress: '{n} réponses sur {max}. On ouvre Undercut à {max}.', founder: 'Les 20 premiers qui confirment leur email utilisent Undercut gratuitement à vie. Les 30 suivants ont le premier mois offert, puis 29 €/mois au lieu de 49 €.', regular: 'Les 20 premiers qui confirment l’utilisent gratuitement à vie, les 30 suivants ont un mois offert puis 29 €/mois. Ensuite : 49 €/mois.',
	doneTitle: 'Vous êtes sur la liste', place: 'Votre place', of: 'sur', moveUp: 'Gagnez 5 places pour chaque ami qui s’inscrit avec votre lien.', copy: 'Copier mon lien', copied: 'Copié', friends: 'amis inscrits avec votre lien', tryNow: 'Essayer une analyse gratuite', privacy: 'Votre email sert uniquement à vous prévenir de votre accès. Pas de spam, désinscription à tout moment.', beta: 'Ouvrez votre email et cliquez sur « Confirmer mon email » : votre place est attribuée à la confirmation, et vous arrivez directement sur votre compte.'
};

const es: WaitDict = {
	title: 'Consigue acceso anticipado a Undercut',
	sub: 'Undercut lee miles de reseñas públicas y muestra lo que los usuarios odian de cualquier app, web o SaaS, al lado de sus competidores. Apúntate y cuéntanos qué necesitas: tus respuestas deciden qué construimos primero.',
	perks: ['Los 20 primeros lo usan gratis de por vida y los 30 siguientes tienen un mes gratis y luego 29 €/mes en vez de 49 €', 'Tus peticiones van primero', 'Acceso antes que nadie'],
	steps: ['Tú', 'Tu producto', 'Hoy en día', 'Lo que necesitas'],
	email: 'Email', name: 'Nombre', next: 'Continuar', back: 'Atrás', send: 'Unirme a la lista', sending: 'Uniéndote…', required: 'Obligatorio',
	role: '¿Qué te describe mejor?',
	roles: [['indie', 'Founder solo / indie'], ['startup', 'Founder de una startup con equipo'], ['pm', 'Product manager'], ['dev', 'Desarrollador/a'], ['designer', 'Diseñador/a'], ['marketing', 'Marketing / growth'], ['agency', 'Agencia o freelance'], ['investor', 'Inversor/a'], ['other', 'Otro']],
	building: '¿Qué estás construyendo?', buildingPh: 'Un enlace, o una línea: «una app de presupuesto para estudiantes»',
	stage: '¿En qué punto está?',
	stages: [['idea', 'Solo una idea'], ['building', 'Construyéndolo'], ['launched', 'Lanzado, sin ingresos aún'], ['revenue', 'Generando ingresos'], ['none', 'No estoy construyendo nada']],
	type: '¿Qué tipo de producto?',
	types: [['mobile', 'App móvil'], ['saas', 'SaaS / app web'], ['website', 'Web o contenido'], ['ecommerce', 'E-commerce'], ['other', 'Otro']],
	today: '¿Cómo descubres hoy lo que no les gusta a tus usuarios?',
	todays: [['stores', 'Leo a mano las reseñas de App Store / Google Play'], ['reddit', 'Reddit, X o foros'], ['support', 'Tickets y emails de soporte'], ['surveys', 'Encuestas o entrevistas'], ['analytics', 'Analytics y grabaciones de sesiones'], ['tool', 'Una herramienta de pago'], ['nothing', 'La verdad, no lo hago']],
	todayOther: '¿Algo más?',
	paid: '¿Pagas hoy alguna herramienta para esto? ¿Cuál y cuánto?', paidPh: 'No / AppFollow, … € / …',
	pain: '¿Qué es lo más difícil o pesado?', painPh: 'Demasiadas reseñas, difícil comparar con la competencia, no tengo tiempo…',
	jobs: '¿Para qué usarías Undercut?', jobsHint: 'Elige hasta 3',
	jobList: [['validate', 'Validar una idea antes de construirla'], ['gaps', 'Ver lo que odian los usuarios de la competencia'], ['roadmap', 'Decidir qué arreglar o construir después'], ['copy', 'Escribir marketing que hable de problemas reales'], ['show', 'Mostrar lo que arreglé (fix score, badge)'], ['research', 'Estudio de mercado o de inversión'], ['monitor', 'Seguir mis propias reseñas en el tiempo']],
	sources: '¿Qué fuentes te importan más?',
	sourceList: [['appstore', 'App Store'], ['googleplay', 'Google Play'], ['reddit', 'Reddit'], ['g2', 'G2 / Capterra'], ['trustpilot', 'Trustpilot'], ['hn', 'Hacker News'], ['github', 'Issues de GitHub'], ['x', 'X / Twitter'], ['producthunt', 'Product Hunt'], ['youtube', 'Comentarios de YouTube']],
	feature: 'Si Undercut hiciera una sola cosa perfecta para ti, ¿cuál sería?', featurePh: 'Alerta semanal cuando un competidor recibe malas reseñas, exportar a Notion…',
	pay: '¿Pagarías 49 € al mes por la base de datos completa?',
	pays: [['yes', 'Sí, hoy mismo'], ['yes-if', 'Sí, si hiciera lo que escribí'], ['lower', 'Solo a un precio más bajo'], ['team', 'Lo pagaría mi empresa'], ['no', 'No']],
	price: '¿Qué precio te parecería justo?', pricePh: '… € / mes',
	other: '¿Algo más que debamos saber?', otherPh: 'Opcional',
	progress: '{n} de {max} respuestas. Abrimos Undercut al llegar a {max}.', founder: 'Las 20 primeras personas que confirmen su email usan Undercut gratis de por vida. Las 30 siguientes tienen el primer mes gratis y después pagan 29 €/mes en vez de 49 €.', regular: 'Las 20 primeras que confirmen lo usan gratis de por vida y las 30 siguientes tienen un mes gratis y luego 29 €/mes. Después: 49 €/mes.',
	doneTitle: 'Estás en la lista', place: 'Tu puesto', of: 'de', moveUp: 'Sube 5 puestos por cada amigo que se apunte con tu enlace.', copy: 'Copiar mi enlace', copied: 'Copiado', friends: 'amigos se apuntaron con tu enlace', tryNow: 'Probar un análisis gratis', privacy: 'Solo usamos tu email para avisarte cuando tengas acceso. Sin spam, te das de baja cuando quieras.', beta: 'Abre tu email y pulsa «Confirmar mi email»: la plaza se da al confirmar y entras directamente a tu cuenta.'
};

export const WAIT: Record<Lang, WaitDict> = { en, fr, es };
