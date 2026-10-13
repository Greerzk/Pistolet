// =====================================================================
//  PISTOLET · Piscina de conexiones PostgreSQL
//  Usa:  const db = require('./db');
// =====================================================================
const { Pool, types } = require('pg');

// PostgreSQL devuelve NUMERIC (OID 1700) e INT8/BIGINT (OID 20) como texto
// para no perder precisión. Aquí los convertimos a número para que la API
// entregue JSON con tipos naturales (precio: 12.00 y no "12.00").
types.setTypeParser(1700, (valor) => (valor === null ? null : parseFloat(valor))); // numeric
types.setTypeParser(20, (valor) => (valor === null ? null : parseInt(valor, 10))); // bigint

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