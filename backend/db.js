// =====================================================================
//  PISTOLET · Piscina de conexiones PostgreSQL
//  Usa:  const db = require('./db');
// =====================================================================
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,   // p.ej. postgres://user:pass@localhost:5432/pistolet
  max: 10,                                       // conexiones simultáneas
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => console.error('Error inesperado en el pool:', err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};