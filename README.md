# Fulgor Burger

Sistema web para agendar hamburguesas por cupos limitados. El cliente entra desde el teléfono, ve la
hamburguesa disponible, elige un día de entrega, deja su nombre y su WhatsApp y confirma, sin crear
cuenta. El negocio administra pedidos, productos, fechas, cupos, logo y textos desde un panel privado.

- **Pública:** `/` (héroe + pedido + cómo funciona + preguntas + contacto), `/contacto`, `/privacidad`.
- **Panel:** `/admin` (resumen, pedidos, fechas y cupos, productos, marca y textos, mi cuenta).

---

## Stack

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | Página pública y panel en un solo proyecto, acciones de servidor con protección de origen incluida. |
| Estilos | Tailwind CSS 4, tokens en `src/app/globals.css` | Colores y tipografía centralizados y fáciles de cambiar. |
| Base de datos | PostgreSQL 17 + Drizzle ORM | Transacciones y bloqueo de filas reales para impedir sobreventa; SQL explícito y tipado. |
| Migraciones | `drizzle/` (SQL versionado) | Se aplican con `pnpm db:migrate`. |
| Validación | Zod + libphonenumber-js | Las mismas reglas en navegador y servidor; el servidor siempre decide. |
| Imágenes | sharp | Las fotos subidas se validan por contenido, se les quitan metadatos (GPS) y se optimizan a WebP. |
| Pruebas | Vitest (contra PostgreSQL real) + Playwright (390 px y 1440 px) | |

Zona horaria de operación: **America/Bogota**. Moneda: **COP** (enteros, formato `$ 28.000`).

---

## Puesta en marcha local

Requisitos: Node 20.9+ (probado con Node 24), pnpm 9+, Docker Desktop (o un PostgreSQL 15+ propio).

```bash
pnpm install
cp .env.example .env        # y completa APP_SECRET y CRON_SECRET (ver abajo)
pnpm db:up                  # PostgreSQL en localhost:5433 (crea las bases fulgor y fulgor_test)
pnpm db:migrate             # crea tablas, índices, restricciones y triggers
pnpm db:seed                # datos iniciales NO destructivos (ver "Contenido de ejemplo")
pnpm admin:create           # crea el primer administrador (ver siguiente sección)
pnpm dev                    # http://localhost:3000  ·  panel en http://localhost:3000/admin
```

Generar secretos:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Para probar desde el teléfono en la misma red: abre la dirección "Network" que imprime `pnpm dev`
(por ejemplo `http://192.168.x.x:3000`).

### Crear el primer administrador (de forma segura)

Las credenciales nunca van en el código. Opciones:

```bash
# 1) Interactivo: pregunta correo, contraseña (mín. 12 caracteres) y nombre
pnpm admin:create

# 2) Con variables solo para ese comando (no las dejes guardadas)
ADMIN_EMAIL=dueno@tu-dominio.com ADMIN_PASSWORD='una-frase-larga-y-unica' pnpm admin:create

# Restablecer la contraseña de un administrador existente (cierra sus sesiones)
pnpm admin:create -- --reset
```

En PowerShell: `$env:ADMIN_EMAIL='…'; $env:ADMIN_PASSWORD='…'; pnpm admin:create` y luego
`Remove-Item Env:ADMIN_PASSWORD`.

---

## Cómo funcionan los cupos (lo crítico)

- Cada fecha de entrega (`delivery_slots`) tiene su **propia capacidad**. Los cupos disponibles se
  calculan siempre en el servidor: `capacidad − unidades de pedidos agendados/confirmados/entregados`.
  Un pedido **cancelado** deja de contar, y por eso cancelar libera el cupo exactamente una vez.
- **Sin sobreventa:** al crear un pedido, el servidor abre una transacción y bloquea la fila de la
  fecha (`SELECT … FOR UPDATE`). Dos personas que piden el último cupo a la vez quedan en fila: una
  confirma y la otra recibe "se agotó, elige otra fecha". Además, un **trigger de PostgreSQL**
  (`drizzle/0001_capacity_guard.sql`) rechaza cualquier escritura que supere la capacidad, aunque
  viniera de otro código.
- **Idempotencia:** el navegador envía una clave única por intento de compra. Un reintento (doble
  clic, red inestable) devuelve el mismo pedido sin descontar dos veces. Personas distintas en el
  mismo teléfono usan claves distintas.
- **Precio en servidor:** el navegador solo envía producto y cantidad; precio y total se calculan con
  la base de datos y se guardan como copia en el pedido (cambiar el precio después no altera el
  historial).
- **Cupos en vivo:** la página consulta `/api/availability` cada 15 s mientras está visible, al volver
  a la pestaña, al elegir fecha, al abrir el resumen y justo antes de confirmar.

Estados de pedido: **Agendado** (`pending`, por defecto), **Confirmado**, **Entregado**, **Cancelado**.
Con qué estado nace un pedido se configura en *Marca y textos*.

## Calendario semanal

- La regla inicial publica **cada domingo, 12:00–6:00 p. m., 20 cupos**; abre el **lunes 00:00** y
  cierra el **sábado anterior a las 8:00 p. m.** Todo es editable en *Fechas y cupos → Regla semanal*
  (día, horario, cupo, apertura, cierre, cuántas fechas publicar por adelantado).
- Una fecha deja de aceptar pedidos sola al llegar su hora de cierre. La siguiente se publica sola,
  con cupo nuevo, sin borrar nada: el historial de semanas anteriores se conserva.
- La publicación ocurre (a) cada vez que alguien abre la página pública (como máximo una vez por
  minuto) y (b) con la tarea programada `GET /api/cron/slots` (cabecera
  `Authorization: Bearer <CRON_SECRET>`). En Vercel ya está configurada en `vercel.json` (diaria,
  00:05 hora de Colombia). En otro servidor, prográmala con cron:
  `5 5 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio/api/cron/slots`
- Desde el panel puedes: pausar, cerrar, reabrir o abrir ya una fecha; cambiar su horario, cierre y
  cupo (nunca por debajo de lo reservado); publicar fechas especiales; pausar todos los pedidos.

---

## Logo, imágenes y textos (dónde cambiarlos)

| Qué | Dónde está | Cómo reemplazarlo |
| --- | --- | --- |
| Logo de la cabecera | `public/brand/fulgor-wordmark-mostaza.svg` | Panel → *Marca y textos → Logo de la cabecera*, o reemplaza el archivo. |
| Logos oficiales (positivo, negativo, una tinta, icono) | `public/brand/originales/` | Copias de los archivos entregados. Las versiones sin fondo de `public/brand/` se derivan de ellos. |
| Favicon, ícono de Apple, imagen social | `src/app/icon.svg`, `apple-icon.png`, `opengraph-image.png` | Regenera con `pnpm brand:generate` tras cambiar los logos. |
| **Foto del producto** | Hoy: **ilustración provisional** (la hamburguesa del logo). No hay fotografías reales. | Panel → *Productos → editar → Foto del producto*. |
| Colores y tipografía | `src/app/globals.css` (`@theme`) | Mostaza `#F5B82E` y café `#3B2218` salen del logo. |
| Contacto, WhatsApp, Instagram, privacidad, cómo se paga | Base de datos (`settings`) | Panel → *Marca y textos*. |

---

## Pruebas y calidad

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # Vitest: 80 pruebas contra PostgreSQL real (base fulgor_test)
pnpm test:e2e      # Playwright: compila producción y prueba en 390 px y 1440 px (base fulgor_test)
pnpm build         # build de producción
```

Antes de `pnpm test` la base `fulgor_test` debe tener migraciones: `pnpm db:test:migrate`
(docker compose la crea vacía la primera vez). Las pruebas **vacían** `fulgor_test`; nunca apuntan a
la base de desarrollo (hay un control que lo impide).

Casos cubiertos: reserva válida que descuenta la cantidad exacta; dos solicitudes simultáneas por el
último cupo (solo una pasa) y 40 simultáneas sobre 20 cupos (se venden exactamente 20); no se excede
la capacidad; fechas pasadas, cerradas, pausadas, que aún no abren y agotadas no aceptan pedidos;
cancelar libera el cupo una sola vez (también con cancelaciones simultáneas); reintentos idempotentes
(secuenciales y simultáneos); precio calculado en servidor; el trigger de la base bloquea escrituras
directas; nadie lee pedidos sin sesión ni entra al panel (también con cookies inventadas);
el administrador crea productos y fechas y ajusta capacidades; cambio semanal sin pérdida de
historial (con fechas en hora de Bogotá); validación de nombre y teléfono; límites anti-abuso;
CSV protegido contra inyección de fórmulas; responsive sin desbordes en 390 px y 1440 px; y cupo
compartido actualizándose solo entre dos navegadores.

---

## Despliegue

Funciona en cualquier host de Node con PostgreSQL. Ejemplo con **Vercel + Neon** (o Supabase/Railway):

1. Crea una base PostgreSQL y copia su URL de conexión (con `sslmode=require` si la piden).
2. En el proyecto de Vercel define las variables de `.env.example`: `DATABASE_URL`,
   `DATABASE_SSL=true`, `APP_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL=https://tu-dominio`.
3. Aplica migraciones y seed una vez, desde tu equipo apuntando a esa base:
   `DATABASE_URL=… DATABASE_SSL=true pnpm db:migrate && pnpm db:seed`.
4. Crea el administrador: `DATABASE_URL=… DATABASE_SSL=true pnpm admin:create`.
5. Despliega. `vercel.json` ya programa la tarea semanal (Vercel envía `CRON_SECRET` automáticamente).

### Supabase (configuración actual)

- Usa la cadena del **Session pooler** (IPv4): `postgresql://postgres.<ref>:<contraseña>@aws-…pooler.supabase.com:5432/postgres`.
  Si la contraseña tiene caracteres especiales, codifícalos (`%40` para `@`, etc.).
- `DATABASE_SSL=true` y `DATABASE_CA_CERT` con la CA de Supabase (*Supabase Root 2021 CA*,
  Project Settings → Database → SSL Configuration → Download certificate). La conexión queda
  cifrada **y verificada**. En Vercel pega el PEM tal cual o en una sola línea con los saltos escritos como `\n`.
- `DATABASE_POOL_MAX=3`: cada instancia serverless abre su propio pool. Si ves "too many
  clients", cambia al *Transaction pooler* (puerto `6543`); la app no usa sentencias preparadas
  con nombre, así que es compatible.
- El archivo local `.env.production` (no versionado) tiene todas las variables de producción
  listas para copiar en Vercel. `pnpm dev` sigue usando `.env` (base local).
- Primera vez: `node --env-file=.env.production scripts/migrate.mjs`, luego
  `pnpm exec tsx --env-file=.env.production --conditions=react-server scripts/seed.ts` y
  `pnpm exec tsx --env-file=.env.production --conditions=react-server scripts/create-admin.ts`.

Servidor propio (VPS/Docker): `pnpm install --frozen-lockfile && pnpm db:migrate && pnpm build && pnpm start`
detrás de un proxy HTTPS (Caddy, Nginx) que envíe `X-Forwarded-For`, y el cron del apartado anterior.

En producción la cookie del panel es `__Host-fulgor_admin` (Secure, HttpOnly, SameSite=Lax): el
panel debe servirse por **HTTPS**.

---

## Seguridad y privacidad

- Panel protegido con usuarios en base de datos, contraseñas con **scrypt**, sesiones de 7 días
  guardadas como hash (el token solo vive en la cookie). La autorización se comprueba en el servidor
  en cada página, acción y exportación; el proxy de `/admin` es solo una redirección rápida.
- Roles: `admin` (todo) y `staff` (preparado para un empleado que solo gestione pedidos).
- No existe ninguna consulta pública de pedidos; los códigos (`FB-XXXXXXX`) son aleatorios.
- Límites anti-abuso en PostgreSQL (sirven con varias instancias): intentos de pedido por cliente,
  pedidos activos por WhatsApp al día, intentos fallidos de inicio de sesión. IP y teléfono se
  anonimizan con HMAC (`APP_SECRET`) antes de usarse como clave. Campo trampa contra robots.
- Las peticiones de escritura públicas exigen origen propio; las respuestas de error no exponen
  detalles internos. Cabeceras de seguridad (CSP `frame-ancestors`, `nosniff`, HSTS…) en
  `next.config.ts`.
- Solo se guardan nombre, WhatsApp (normalizado E.164), lo pedido y, si lo activas, la dirección.
  No hay pagos ni datos de tarjetas. **No se envían WhatsApp automáticos**: solo enlaces `wa.me` que
  abre una persona.
- Base de datos: la aplicación usa un único usuario de PostgreSQL y nada es accesible desde el
  navegador. En producción usa un usuario con permisos solo sobre esta base. Las políticas RLS no
  aportan aquí porque no hay acceso directo de clientes a la base.

---

## Contenido de ejemplo que debes revisar

El seed crea valores de ejemplo para que el sistema funcione desde el primer minuto. **Revísalos:**

- Producto "Fulgor Clásica", su descripción y su precio **$ 28.000** (inventados).
- Horario de entrega 12:00–6:00 p. m., cierre sábado 8:00 p. m., 6 unidades máximo por pedido.
- Texto "Coordinamos el pago contigo por WhatsApp antes de la entrega" y el aviso de privacidad
  (revísalo con tu asesor; no se afirma cumplimiento legal).
- WhatsApp, Instagram, correo, dirección y zona de entrega están **vacíos**: mientras no los
  completes, la página no muestra botones de WhatsApp ni datos de contacto.
- Foto real del producto (hoy, ilustración del logo).

---

## Solución de problemas

| Síntoma | Causa probable |
| --- | --- |
| `Falta la variable de entorno DATABASE_URL` | No existe `.env` o no tiene la URL. |
| `ECONNREFUSED 127.0.0.1:5433` | PostgreSQL no está corriendo: abre Docker Desktop y `pnpm db:up`. |
| `APP_SECRET no está configurado` | Falta el secreto o tiene menos de 32 caracteres. |
| No aparecen fechas en la página | La regla está desactivada, la próxima fecha aún no abre ("Abre el…"), o los pedidos están en pausa. Revisa *Fechas y cupos*. |
| El panel vuelve siempre al login en producción | Se está sirviendo por HTTP: la cookie segura exige HTTPS. |
| "Demasiados intentos" al entrar | 8 intentos fallidos en 15 min para ese correo; espera o restablece con `pnpm admin:create -- --reset`. |
| Las pruebas fallan con `relation … does not exist` | Falta `pnpm db:test:migrate`. |

## Estructura

```
src/app/(public)/        página pública, contacto, privacidad
src/app/admin/           panel (login, (panel)/…, actions.ts con las acciones de servidor)
src/app/api/             disponibilidad, pedidos, cron
src/app/media/[id]/      imágenes subidas
src/components/          brand (logo animable, destellos de cupo), public, admin
src/lib/                 utilidades compartidas: hora de Bogotá, COP, teléfono, validación
src/server/              db (esquema, cliente), auth, services (reglas de negocio), http
drizzle/                 migraciones SQL versionadas
scripts/                 migrate, seed, create-admin, generate-brand-assets
tests/unit, tests/e2e    Vitest y Playwright
```
