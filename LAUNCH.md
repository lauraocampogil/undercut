# Lanzamiento de Undercut: lo que tienes que hacer tú

Todo lo del código ya está hecho. Esto son los pasos que solo puedes hacer tú (cuentas y claves).

## 1. Stripe (el pago de €49/mes)

1. <https://dashboard.stripe.com> → activa tu cuenta (datos de la empresa y del banco).
2. **Product catalog → Add product**: «Undercut · Full database», precio **49 EUR, recurring, monthly**.
3. Copia el **Price ID** (`price_...`) → `STRIPE_PRICE_DATABASE`.
   En el mismo producto, **Add another price**: 29 EUR, recurring, monthly → su Price ID va en `STRIPE_PRICE_FOUNDER` (precio de fundador para los 30 primeros de la waitlist).
4. **Developers → API keys** → copia la **Secret key** (`sk_live_...`) → `STRIPE_SECRET_KEY`.
5. **Settings → Billing → Customer portal** → actívalo y deja «Cancel at end of billing period».
6. Prueba primero con las claves `sk_test_...` y la tarjeta 4242 4242 4242 4242.

## 2. Google (botón «Continue with Google»)

1. <https://console.cloud.google.com/auth/clients> → tu cliente OAuth → añade:
   - Authorized JavaScript origins: `https://app.getundercut.app`
   - Authorized redirect URIs: `https://app.getundercut.app/auth/google/callback`
2. <https://console.cloud.google.com/auth/scopes> (Data access): deja **solo** `openid`, `email` y `profile`. Quita Analytics, Search Console, etc.
3. <https://console.cloud.google.com/auth/audience> → **Publish app**. Con solo esos 3 permisos Google no pide verificación. Sin esto, solo tus «test users» pueden entrar.

## 3. Email (bienvenida y contraseña olvidada)

Ya tienes `RESEND_API_KEY`. En <https://resend.com/domains> comprueba que `mail.getundercut.app` está **Verified**; si no, los emails no salen.

## 4. Variables en el servidor (Coolify)

```env
SITE_URL=https://getundercut.app
PUBLIC_BASE_URL=https://app.getundercut.app
ORIGIN=https://app.getundercut.app
SESSION_SECRET=   # 64 caracteres al azar: openssl rand -hex 32. ¡Obligatorio! Sin él, todos pierden la sesión en cada deploy.
CRON_SECRET=      # otro valor al azar: openssl rand -hex 32
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-5-5
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
ALERTS_FROM=Undercut <hello@mail.getundercut.app>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_DATABASE=price_...
GITHUB_TOKEN=...
TZ=Europe/Brussels
WAITLIST=on        # quítalo (o déjalo vacío) el día que abras a todo el mundo
```

`GOOGLE_REDIRECT_URI` puede quedar vacío (se calcula solo).

## 5. Datos de la empresa (páginas legales)

En `src/lib/legal.ts` rellena `form`, `enterprise` (número BCE) y `address`. Es obligatorio en Bélgica para vender online.

## 6. Prueba completa antes del jueves (15 min)

1. Ventana privada → getundercut.app → pega una URL → **Analyze** → te pide crear cuenta.
2. Crea la cuenta con email → llega el email de bienvenida → vuelves a tu análisis.
3. Log out → **Forgot your password?** → llega el email → nueva contraseña.
4. Crea otra cuenta con Google.
5. **Database**: solo 15 productos → **Unlock** → paga con Stripe (modo test) → ves todos.
6. **Billing → Manage subscription** → cancela.
7. Analiza tu propio producto → **Claim** → aparece en **My products** con el badge.
8. **My account → Delete my account** con la cuenta de prueba.

## Waitlist

- Formulario público: `getundercut.app/waitlist` (en, fr, es). Cada persona recibe su puesto y un enlace para invitar (sube 5 puestos por amigo).
- Resultados: `app.getundercut.app/admin/waitlist` (solo tu cuenta admin): gráficos por respuesta, todas las respuestas y botón **Download CSV**.
- `WAITLIST=on`: todos los botones de la landing van a la waitlist y nadie nuevo puede crear cuenta. Tú sigues entrando con /login.

### El día que llegues a 50 respuestas

1. En el servidor: borra `WAITLIST=on` (o déjalo vacío) y redeploy.
2. Abre `/admin/waitlist` → **Send the opening email**. Cada persona recibe un email: los 30 primeros con el precio de 29 €, los demás con 49 €.
3. Los 30 primeros ven 29 € en Billing **si se registran con el mismo email** que usaron en la waitlist.
