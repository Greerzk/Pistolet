# Despliegue de Pistolet (Neon + Render)

Guía para publicar la API y la base de datos en producción, y apuntar la
app móvil/web a ese entorno. Al final, las opciones para distribuir la app.

---

## Estado actual (ya desplegado)

- **Repositorio:** https://github.com/Greerzk/Pistolet (rama `main`).
- **Base de datos:** Neon (PostgreSQL 18). Esquema, funciones y datos de
  ejemplo cargados. Stock inicial: 100 conchas, 50 cuernos, 30 baguettes.
- **API en producción:** https://pistolet-api.onrender.com
- **Usuario admin:** `admin@pistolet.mx` (contraseña definida al crearlo).
- **Imágenes de muestra:** `backend/public/img/productos/pan/*.jpg`
  (reemplázalas por fotos reales y haz `git push`).
- **Web en producción:** https://pistolet-khaki.vercel.app (Vercel).
  Está conectada a GitHub: cada `git push` a `main` la vuelve a desplegar sola.
- **App móvil (Expo):** SDK 57 — compatible con el **Expo Go** actual de la
  tienda (Android y iOS). Ya no hace falta instalar un Expo Go antiguo.

Todo quedó desplegado: base de datos (Neon), API (Render) y web (Vercel).
En Vercel el proyecto usa **Services** con un único servicio `web` (ver
`vercel.json`) y su **Root Directory** debe ser la raíz del repo (no
`backend`). La Variable de Entorno `EXPO_PUBLIC_API_URL` debe valer
`https://pistolet-api.onrender.com` (Production, Preview y Development).

> **Nota:** la URL de la API se incrusta al compilar. El código debe leerla
> con la expresión literal `process.env.EXPO_PUBLIC_API_URL` (ver
> `constants/api.ts`); de lo contrario Expo no la sustituye y la app usaría
> el valor por defecto de desarrollo.

---

## 0. Requisitos previos

- Cuenta en **GitHub** (Render despliega desde un repo Git).
- Cuenta gratis en **Neon** (PostgreSQL) → https://neon.tech
- Cuenta gratis en **Render** → https://render.com
- Node.js 18+ instalado localmente.

---

## 1. Subir el código a GitHub

El proyecto aún no es un repositorio Git. Desde la raíz `PistoletApp`:

```bash
git init
git add .
git commit -m "Pistolet: app, API y base de datos"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pistolet.git
git push -u origin main
```

> `.gitignore` ya excluye `node_modules/` y los `.env`. **Nunca** subas
> secretos al repositorio.

---

## 2. Crear la base de datos en Neon

1. En el panel de Neon: **New Project** → nombre `pistolet`.
2. Copia la **Connection string** (usa la **Pooled**, con `?sslmode=require`).
   Se ve así:

   ```
   postgresql://usuario:password@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

3. Guarda esa cadena, la usarás como `DATABASE_URL` en Render.

---

## 3. Ejecutar los scripts SQL

En Neon abre **SQL Editor** y ejecuta **en este orden** (pega el contenido de
cada archivo):

1. `db/schema.sql` → tablas, tipos, índices, triggers y datos de ejemplo.
2. `db/migracion.sql` → *(opcional)* migración/carga de catálogo.
3. `db/procedimientos.sql` → funciones `registrar_produccion`, `crear_pedido`,
   `registrar_pago`, `cancelar_pedido`, `reembolsar_pago`.

---

## 4. Crear usuarios reales (contraseñas con bcrypt)

Genera el hash de la contraseña (nunca la guardes en texto plano):

```bash
cd backend
node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD_SEGURA', 10))"
```

Luego inserta el usuario en Neon (sustituye el hash):

```sql
INSERT INTO usuario (nombre, email, password_hash, rol)
VALUES ('Administrador', 'admin@pistolet.mx', '$2a$10$...AQUI_EL_HASH...', 'admin');
```

---

## 5. Desplegar el backend en Render

1. Render → **New** → **Blueprint** → conecta tu repo de GitHub.
2. Detecta `render.yaml` y crea el servicio `pistolet-api` (rootDir `backend`).
3. Cuando lo pida, pega `DATABASE_URL` (la cadena de Neon del paso 2).
   `JWT_SECRET` se genera automáticamente.
4. Espera el primer deploy. Tu API queda en algo como:
   `https://pistolet-api.onrender.com`

> **Plan free:** el servicio "duerme" tras ~15 min sin uso; la primera
> petición puede tardar ~30–50 s en despertar. Normal para demo.

### Imágenes de productos

Copia tus imágenes a `backend/public/img/productos/pan/` y súbelas al repo.
Quedarán servidas automáticamente en
`https://pistolet-api.onrender.com/img/productos/pan/<archivo>.jpg`.

### Fotos de perfil (Cloudinary)

Las **fotos de perfil** se guardan en **Cloudinary** (no en disco ni en la
base de datos): en disco se perderían en cada redespliegue de Render, y en la
base inflarían el almacenamiento. En Postgres solo se guardan `avatar_url` y
`avatar_public_id`.

Para activarlas (una sola vez):

1. Crea una cuenta gratis en https://cloudinary.com
2. En el **Dashboard** copia **Cloud name**, **API Key** y **API Secret**.
3. En Render → tu servicio → **Environment** agrega:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

   (En local, agrégalas a `backend/.env` — copia de `.env.example`).
4. Si tu base **ya existía**, ejecuta `db/migracion_avatar.sql` en el SQL
   Editor de Neon (agrega las columnas `avatar_url` y `avatar_public_id`).
   Si creas la base desde cero con `db/schema.sql`, ya vienen incluidas.

La imagen se recorta a **1000×1000** y el backend usa el campo `imagen`
(multipart). Si las variables no están configuradas, los endpoints de la foto
responden `503` y el resto de la API funciona con normalidad.

---

## 6. Verificar que todo responde

```bash
curl https://pistolet-api.onrender.com/api/health
# → {"ok":true}

curl "https://pistolet-api.onrender.com/api/productos?q=concha&page=1&pageSize=20"
# → { "data": [...], "total": 1, "totalPages": 1 }

curl -X POST https://pistolet-api.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pistolet.mx","password":"TU_PASSWORD_SEGURA"}'
# → { "accessToken": "...", "refreshToken": "...", "user": { ... } }
```

---

## 7. Apuntar la app a la API de producción

La URL de la API se inyecta por variable de entorno, sin editar código:

**macOS / Linux / Git Bash:**

```bash
EXPO_PUBLIC_API_URL=https://pistolet-api.onrender.com npx expo start
```

**Windows (PowerShell):**

```powershell
$env:EXPO_PUBLIC_API_URL = "https://pistolet-api.onrender.com"
npx expo start
```

Antes de compilar, alinea versiones de dependencias de Expo:

```bash
npx expo install --fix
```

---

## 8. Distribuir / probar la app

| Opción | Ventajas | Consideraciones |
|---|---|---|
| **Web** (Vercel) | Ya publicada; se comparte con link/QR, sin instalar | Ya funciona: https://pistolet-khaki.vercel.app |
| **Expo Go** | Inmediato para probar en tu celular, sin compilar | Requiere el código en tu PC y misma red Wi-Fi (o túnel) |
| **EAS Build (Android)** | **APK** instalable; no necesita PC ni red local | Requiere cuenta gratis en expo.dev |
| **EAS Build (iOS)** | TestFlight / App Store | Requiere cuenta Apple Developer (~USD 99/año) |

### A) Probarla en el celular con Expo Go (sin compilar)

1. Instala **Expo Go** desde Play Store (Android) o App Store (iPhone).
2. En tu PC, arranca el servidor apuntando a la API de producción:

   **Windows (PowerShell):**

   ```powershell
   $env:EXPO_PUBLIC_API_URL = "https://pistolet-api.onrender.com"
   npx expo start
   ```

   **macOS / Linux:**

   ```bash
   EXPO_PUBLIC_API_URL=https://pistolet-api.onrender.com npx expo start
   ```

3. Escanea el QR con **Expo Go** (Android) o con la **cámara** (iPhone).
   - Celular y PC en la **misma red Wi-Fi**.
   - Si no cargan los archivos, usa túnel: `npx expo start --tunnel`
     (te pedirá instalar `@expo/ngrok`).

> El bundle de JS se descarga desde tu PC, pero las llamadas a la **API** van a
> Render por internet: la API no necesita estar en tu red local.

### B) Generar un APK instalable (EAS Build)

Ya quedó preparado `eas.json` (perfil `preview` → **APK**) y el nombre de
paquete en `app.json` (`com.pistolet.app`). Solo faltan estos pasos, una vez:

```bash
npx eas-cli login            # crea/entra a tu cuenta gratis en expo.dev
npx eas-cli build:configure  # (opcional) vincula el proyecto
```

Para generar el APK (tarda ~10–20 min en la nube de Expo):

```bash
npm run build:apk
# equivale a: npx eas-cli build -p android --profile preview
```

Cuando termine, EAS te da un **link para descargar el `.apk`**. Ábrelo en el
celular, permite "instalar apps de origen desconocido" e instálalo. El APK ya
apunta a `https://pistolet-api.onrender.com` (definido en `eas.json`), así que
funciona sin tu PC y sin red local.

> Alternativa sin nube (requiere Android SDK + JDK instalados):
> `npx eas-cli build -p android --profile preview --local`
>
> Para Play Store usa `npm run build:apk` con el perfil `production` y luego
> `npx eas-cli submit -p android`.

---

## 9. Checklist de seguridad

- [ ] HTTPS en la API (Render lo da por defecto).
- [ ] `JWT_SECRET` largo y distinto al de desarrollo (Render lo genera).
- [ ] Contraseñas con `bcryptjs` (nunca texto plano).
- [ ] `.env` fuera del repositorio (`.gitignore` ya lo excluye).
- [ ] `CORS_ORIGIN` acotado a tu dominio web (cuando publiques la web).
- [ ] Rate-limit activo en `/api/login` (ya configurado: 20 intentos / 15 min).
- [ ] `password_hash` nunca se devuelve en las respuestas.

---

## 10. Web Angular (`frontend/`)

La tienda/panel web es un proyecto **Angular** que vive en `frontend/` y consume
**la misma API y la misma base de datos (Neon)** que la app móvil. Cualquier
cambio en la base se refleja en ambas automáticamente.

### Correr en local

```powershell
cd frontend
npm install
npm start        # abre http://localhost:4200
```

Por defecto apunta al backend en Render (`environment.ts`). Si quieres probar un
backend local, edita `frontend/src/environments/environment.ts` y usa
`http://localhost:3000/api` y `http://localhost:3000/img`.

### Desplegar en Vercel (segundo proyecto)

1. Vercel → **Add New… → Project** → importa el mismo repo
   `Greerzk/Pistolet`.
2. En **Root Directory** selecciona **`frontend`**.
3. Framework: **Angular** (Vercel lo detecta). Build: `npm run build`
   (definido en `frontend/vercel.json`, salida `dist/pistolet-frontend2/browser`).
4. Deploy. Queda una URL tipo `https://pistolet-web.vercel.app`.
5. (Opcional) En Render, ajusta `CORS_ORIGIN` al dominio de Vercel para
   restringir el acceso.

> El proyecto Vercel **raíz** sigue siendo la app Expo web
> (`vercel.json` en la raíz). Este segundo proyecto solo sirve el Angular de
> `frontend/`.

### Notas

- Los proveedores se eliminaron: el insumo guarda `proveedor` como **texto**.
- Las imágenes de productos viven en el backend
  (`/img/productos/pan/<archivo>`). En Render el disco es efímero: las imágenes
  subidas desde el panel se pierden al redeploy (mover a Cloudinary/S3 luego).
