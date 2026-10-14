// =====================================================================
//  PISTOLET · Categorías de productos
//    GET /api/categorias  → [{ id, nombre, slug }]
// =====================================================================
const { Router } = require('express');
const db = require('../db');

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nombre, slug FROM categoria WHERE activo ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
