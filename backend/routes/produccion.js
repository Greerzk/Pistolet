// =====================================================================
//  PISTOLET · API de producción (staff)
//    POST /    registrar un lote   -> registrar_produccion()
//    GET  /    historial de lotes con consumos de insumos
// =====================================================================
const { Router } = require('express');
const auth = require('../middleware/auth');
const db = require('../db');

const router = Router();

// ---------------------------------------------------------------------
// POST /api/produccion
// Body: { producto_id: number, cantidad: number }
// ---------------------------------------------------------------------
router.post('/', auth(['empleado', 'admin']), async (req, res, next) => {
  try {
    const { producto_id, cantidad } = req.body;
    const { rows } = await db.query(
      `SELECT * FROM registrar_produccion($1, $2, $3) AS produccion_id`,
      [producto_id, cantidad, req.user.id]
    );
    res.status(201).json({ produccion_id: rows[0].produccion_id });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// GET /api/produccion
// ---------------------------------------------------------------------
router.get('/', auth(['empleado', 'admin']), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.id, pr.folio, pr.cantidad, pr.costo_total, pr.creado_en,
              p.nombre AS producto,
              COALESCE(
                json_agg(
                  json_build_object('insumo', i.nombre, 'cantidad', pc.cantidad, 'subtotal', pc.subtotal)
                ) FILTER (WHERE pc.id IS NOT NULL), '[]'
              ) AS consumos
         FROM produccion pr
         JOIN producto p ON p.id = pr.producto_id
         LEFT JOIN produccion_consumo pc ON pc.produccion_id = pr.id
         LEFT JOIN insumo i ON i.id = pc.insumo_id
        GROUP BY pr.id, p.nombre
        ORDER BY pr.creado_en DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;