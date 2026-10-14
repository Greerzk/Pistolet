// =====================================================================
//  PISTOLET · App Express (API de la panadería)
//
//  Dependencias:  npm install
//  Desarrollo:    npm run dev
//  Producción:    npm start   (Render usa este comando)
//
//  Variables de entorno (.env):
//    DATABASE_URL   cadena de conexión PostgreSQL (Neon)
//    JWT_SECRET     secreto para firmar los JWT
//    PORT           puerto (Render lo inyecta)
//    CORS_ORIGIN    origen permitido para la web (por defecto "*")
// =====================================================================
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Render corre detrás de un proxy: necesario para IP real y rate-limit
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// Imágenes públicas de productos.
// Coloca tus archivos en: backend/public/img/productos/pan/*.jpg
// Se publican en:          /img/productos/pan/<archivo>.jpg
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));

// Límite de intentos de login (frena ataques de fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
});

// Raíz informativa: al abrir la URL en el navegador no verás una web,
// esto es una API JSON. Evita el confuso "Cannot GET /".
app.get('/', (_req, res) =>
  res.json({
    api: 'Pistolet',
    estado: 'ok',
    mensaje: 'Esto es la API (JSON), no una web. Prueba /api/health o /api/productos.',
    endpoints: [
      '/api/health', '/api/productos', '/api/categorias', '/api/login',
      '/api/register', '/api/pedidos', '/api/produccion',
      '/api/insumos', '/api/users', '/api/reports/inventory',
    ],
  })
);

// Health check (Render lo usa para saber si el servicio está vivo)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Rutas
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/login',      loginLimiter, require('./routes/login'));
app.use('/api/register',   loginLimiter, require('./routes/register'));
app.use('/api/pedidos',    require('./routes/pedidos'));
app.use('/api/produccion', require('./routes/produccion'));
app.use('/api/productos',  require('./routes/productos'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/insumos',    require('./routes/insumos'));
app.use('/api/users',      require('./routes/usuarios'));
app.use('/api/reports',    require('./routes/reportes'));

// Rutas no encontradas -> 404 en JSON (en vez del HTML "Cannot GET ...")
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Traduce los RAISE EXCEPTION de Postgres y demás errores a JSON legible
app.use((err, _req, res, _next) => {
  console.error(err);
  const msg = err?.message || 'Error interno del servidor';
  res.status(400).json({ error: msg });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Pistolet escuchando en :${PORT}`));