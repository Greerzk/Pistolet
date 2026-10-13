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

```bash
EXPO_PUBLIC_API_URL=https://pistolet-api.onrender.com npx expo start
```

Antes de compilar, alinea versiones de dependencias de Expo:

```bash
npx expo install --fix
```

---

## 8. Distribuir la app (opciones)

| Opción | Ventajas | Consideraciones |
|---|---|---|
| **Web estática** (Vercel/Netlify) | Se comparte con un link/QR, sin instalar; funciona en cualquier celular | La API debe ser HTTPS (ya lo es) y con CORS |
| **Expo Go** | Inmediato para probar en tu equipo | No es distribución final; requiere red/túnel |
| **EAS Build (Android)** | APK directo o subir a Play Store | Más fácil que iOS |
| **EAS Build (iOS)** | TestFlight / App Store | Requiere cuenta Apple Developer (~USD 99/año) |

### Web estática (recomendada para empezar)

```bash
EXPO_PUBLIC_API_URL=https://pistolet-api.onrender.com npx expo export --platform web
# genera la carpeta dist/ → súbela a Vercel o Netlify
```

### Android con EAS (cuando quieras app instalable)

```bash
npm i -g eas-cli
eas login
eas build:configure
EXPO_PUBLIC_API_URL=https://pistolet-api.onrender.com eas build -p android --profile preview
```

---

## 9. Checklist de seguridad

- [ ] HTTPS en la API (Render lo da por defecto).
- [ ] `JWT_SECRET` largo y distinto al de desarrollo (Render lo genera).
- [ ] Contraseñas con `bcryptjs` (nunca texto plano).
- [ ] `.env` fuera del repositorio (`.gitignore` ya lo excluye).
- [ ] `CORS_ORIGIN` acotado a tu dominio web (cuando publiques la web).
- [ ] Rate-limit activo en `/api/login` (ya configurado: 20 intentos / 15 min).
- [ ] `password_hash` nunca se devuelve en las respuestas.
