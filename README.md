# Pistolet 🥐

Sistema unificado de una panadería: **una sola API**, **una sola base de datos**
y dos clientes (app móvil y web) que ven **la misma información en tiempo real**.

```
PistoletApp/
├── app/        App móvil (Expo / React Native, SDK 57)
├── frontend/   Web (Angular 21) — tienda pública + panel de administración
├── backend/    API (Node.js + Express) — lógica y reglas de negocio
└── db/         Esquema y funciones de PostgreSQL
```

## Arquitectura

| Capa | Tecnología | Producción |
|---|---|---|
| Base de datos | PostgreSQL | **Neon** |
| API | Node.js + Express | **Render** → https://pistolet-api.onrender.com |
| Web | Angular 21 | **Vercel** (proyecto con Root Directory `frontend`) |
| App móvil | Expo (React Native) | Expo Go / EAS Build (APK) |

Tanto la app como la web consumen `https://pistolet-api.onrender.com/api` y
comparten la misma base de datos: cualquier cambio (producto, stock, venta,
usuario) se refleja en ambos clientes.

## Desarrollo local

**API**

```bash
cd backend
npm install
# crea backend/.env con DATABASE_URL (Neon) y JWT_SECRET
npm run dev            # http://localhost:3000
```

**Web**

```bash
cd frontend
npm install
npm start              # http://localhost:4200
```

**App móvil**

```bash
npm install
npx expo start         # Expo Go en tu celular
```

Por defecto ambos clientes apuntan a la API de Render. Para usar un backend
local, cambia la URL en `frontend/src/environments/environment.ts` y define
`EXPO_PUBLIC_API_URL=http://localhost:3000` antes de `npx expo start`.

## Base de datos

En Neon ejecuta, en este orden:

1. `db/schema.sql`
2. `db/procedimientos.sql`

## Despliegue

Consulta **[DEPLOY.md](DEPLOY.md)** para la guía completa (Neon, Render, Vercel,
Expo Go y APK con EAS Build).

## Notas

- **Proveedores:** se eliminaron como módulo; el insumo guarda `proveedor` como
  texto libre.
- **Pagos:** solo en mostrador (efectivo o tarjeta al recoger).
- **Autenticación:** JWT (access token de 15 min + refresh token de 30 días);
  las contraseñas usan `bcryptjs` y nunca se devuelven en las respuestas.
- **Imágenes:** se sirven desde el backend (`/img/productos/pan/...`). En el plan
  free de Render el disco es efímero: las imágenes subidas desde el panel se
  pierden al redeploy (a futuro: Cloudinary/S3).
