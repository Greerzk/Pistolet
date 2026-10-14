// =====================================================================
//  PISTOLET · Insumos (materias primas) — CRUD para el panel admin
//    GET    /api/insumos        → lista
//    POST   /api/insumos        → crear
//    PUT    /api/insumos/:id    → actualizar
//    DELETE /api/insumos/:id    → baja lógica (activo = false)
//
//  El stock se queda como caché; la fuente de verdad son los
//  movimientos (movimiento_insumo). Aquí solo se administra el catálogo
//  y los ajustes simples de stock.
// =====================================================================
const { Router } = require('express');
const auth = require('../middleware/auth');
const db = require('../db');

const router = Router();

// ---------------------------------------------------------------------
// GET /api/insumos
// ---------------------------------------------------------------------
router.get('/', auth(['empleado', 'admin']), async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, unidad, stock, stock_minimo, costo_unitario, proveedor
         FROM insumo
        WHERE activo
        ORDER BY nombre`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// POST /api/insumos
// Body: { nombre, unidad, stock?, stock_minimo?, costo_unitario?, proveedor? }
// ---------------------------------------------------------------------
router.post('/', auth(['empleado', 'admin']), async (req, res, next) => {
  try {
    const { nombre, unidad, stock, stock_minimo, costo_unitario, proveedor } = req.body ?? {};
    if (!nombre || !unidad) {
      return res.status(400).json({ error: 'Nombre y unidad son obligatorios' });
    }

    const { rows } = await db.query(
      `INSERT INTO insumo (nombre, unidad, stock, stock_minimo, costo_unitario, proveedor)
       VALUES ($1, $2, COALESCE($3::numeric, 0), COALESCE($4::numeric, 0),
               COALESCE($5::numeric, 0), $6)
       RETURNING id`,
      [nombre, unidad, stock, stock_minimo, costo_unitario, proveedor || null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// PUT /api/insumos/:id
// ---------------------------------------------------------------------
router.put('/:id', auth(['empleado', 'admin']), async (req, res, next) => {
  try {
    const { nombre, unidad, stock, stock_minimo, costo_unitario, proveedor } = req.body ?? {};
    const { rowCount } = await db.query(
      `UPDATE insumo
          SET nombre         = COALESCE($1, nombre),
              unidad         = COALESCE($2, unidad),
              stock          = COALESCE($3, stock),
              stock_minimo   = COALESCE($4, stock_minimo),
              costo_unitario = COALESCE($5, costo_unitario),
              proveedor      = $6
        WHERE id = $7 AND activo`,
      [nombre, unidad, stock, stock_minimo, costo_unitario, proveedor || null, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// DELETE /api/insumos/:id   (baja lógica)
// ---------------------------------------------------------------------
router.delete('/:id', auth(['empleado', 'admin']), async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'UPDATE insumo SET activo = false WHERE id = $1 AND activo',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
