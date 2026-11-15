# Poner Undercut en marcha con tus sitios reales

Tres pasos: **1) Google** (10 min), **2) probar en local**, **3) publicar en tu VPS con Coolify** para que tus sitios envíen visitas, leads y heatmaps.

> Sin publicar, Google (Analytics, Search Console, Tag Manager) ya funciona en local.
> El snippet necesita una dirección pública: tus sitios no pueden enviar datos a `localhost`.

---

## 1. Google Cloud (una sola vez)

1. Abre <https://console.cloud.google.com/projectcreate> → crea un proyecto **Undercut**.
2. Activa estas APIs (abre cada enlace → **Enable**):
   - <https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com>
   - <https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com>
   - <https://console.cloud.google.com/apis/library/searchconsole.googleapis.com>
   - <https://console.cloud.google.com/apis/library/tagmanager.googleapis.com>
   - Google Maps / Business Profile (opcional, Google tiene que aprobar el acceso: <https://developers.google.com/my-business/content/prereqs>):
     `businessprofileperformance`, `mybusinessaccountmanagement`, `mybusinessbusinessinformation`
3. **OAuth consent screen** → <https://console.cloud.google.com/auth/branding>
   - Tipo **External**, nombre “Undercut”, tu email de soporte.
   - **Audience → Test users** → añade tu email de Google.
4. **Crear el cliente OAuth** → <https://console.cloud.google.com/auth/clients/create>
   - Tipo **Web application**
   - Authorized JavaScript origins: `http://localhost:5173` (y más tarde `https://undercut.tudominio.be`)
   - Authorized redirect URIs: `http://localhost:5173/auth/google/callback` (y más tarde `https://undercut.tudominio.be/auth/google/callback`)
5. Copia **Client ID** y **Client secret**.

El mismo cliente sirve para **“Continue with Google”** (login) y para **conectar los datos**.
En modo “Testing” Google pide reconectar cada 7 días. Cuando todo funcione pulsa **Publish app**: Google mostrará un aviso de “app no verificada” (pulsa *Advanced → Continue*); la verificación oficial solo hace falta cuando lo abras a otras agencias.

---

## 2. Probar en local (tu Mac)

```bash
cd ~/Documents/Websites/undercut
npm install
cp .env.example .env
```

En `.env`:

```env
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
PUBLIC_BASE_URL=http://localhost:5173
```

```bash
npm run dev
```

1. <http://localhost:5173/signup> → **Sign up with Google** (o email + contraseña).
2. Onboarding → añade tu primer sitio → **Continue with Google** → Undercut encuentra sus propiedades de GA4, Search Console y Tag Manager.
3. Abre el cliente: Summary, Traffic, Search & Maps y Keywords muestran tus datos reales de Google.
4. **SEO & fixes** analiza la web de verdad (Lighthouse, W3C, sitemap, robots.txt).

Para empezar de cero: borra la carpeta `.data/`.

---

## 3. Publicar en tu VPS (Coolify)

1. Haz `git push` del repo.
2. En Coolify → **+ New → Application → tu repo GitHub** (`lauraocampogil/undercut`), rama `main`.
3. **Build Pack: Dockerfile** (el repo ya tiene `Dockerfile`). Puerto: **3000**.
4. **Domain**: `https://undercut.tudominio.be` (Traefik pone el certificado).
5. **Persistent storage** → volumen montado en **`/app/.data`** (sin esto se pierden datos al redesplegar).
6. **Environment variables**:

   ```env
   ORIGIN=https://undercut.tudominio.be
   PUBLIC_BASE_URL=https://undercut.tudominio.be
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   SESSION_SECRET=   # openssl rand -hex 32
   ADDRESS_HEADER=X-Forwarded-For
   XFF_DEPTH=1
   TZ=Europe/Brussels
   # opcionales
   RESEND_API_KEY=...            # emails: alertas, resumen del lunes, invitaciones (ya usas Resend)
   ALERTS_FROM=Undercut <alerts@tudominio.be>
   ANTHROPIC_API_KEY=...         # resúmenes y asistente con IA
   PAGESPEED_API_KEY=...         # más cuota para Lighthouse
   SERPAPI_KEY=...               # Google Trends en Keywords
   ```

7. **Deploy**.
8. En Google Cloud añade el origin y el redirect URI de `https://undercut.tudominio.be` (paso 1.4).
9. Entra en `https://undercut.tudominio.be/signup`.

Las alertas diarias (≈06:15) y el resumen del lunes los envía un temporizador interno; no hace falta cron.

### Instalar el snippet en tus sitios

Cliente → **Setup & connections** → copia la línea:

```html
<script defer src="https://undercut.tudominio.be/u.js" data-site="nombre-del-cliente"></script>
```

Pégala antes de `</head>` (SvelteKit: `src/app.html`; WordPress: plugin WPCode; Webflow/Wix/Shopify: código personalizado; o Tag Manager → Custom HTML).
Con la primera visita aparecen visitas, fuentes, leads (formularios, teléfono, email, WhatsApp), heatmaps y campañas (enlaces con UTM).

---

## Qué viene de dónde

| Sección | Fuente real |
| --- | --- |
| Traffic | Snippet Undercut, o GA4 si está conectado |
| Leads, Heatmaps, Campaigns | Snippet Undercut |
| Search & Maps, Keywords (web) | Search Console · Business Profile |
| Keywords (app) | App Store (posición pública, sin clave) |
| App analytics | GA4 enlazado a Firebase · App Store (notas y reseñas) |
| SEO & fixes | Lighthouse (PageSpeed), W3C, sitemap, robots.txt — y los fixes los aplica el snippet |
| Alertas | Slack (webhook) o email (Resend) |

Un cliente real **nunca** muestra datos inventados: lo que no está conectado aparece como “Not linked” con el botón para conectarlo. Los clientes de ejemplo (demo) solo existen si los mantienes al crear la cuenta.
