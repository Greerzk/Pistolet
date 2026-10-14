// =====================================================================
//  PISTOLET · Reportes para el panel admin
//    GET /api/reports/inventory   → insumos con stock <= stock_minimo
//    GET /api/reports/sales       → corte de caja del día (o ?desde&hasta)
// =====================================================================
const { Router } = require('express');
const auth = require('../middleware/auth');
const db = require('../db');

const router = Router();

// ---------------------------------------------------------------------
// GET /api/reports/inventory
// ---------------------------------------------------------------------
router.get('/inventory', auth(['empleado', 'admin']), async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, unidad, stock, stock_minimo, proveedor,
              (stock_minimo - stock) AS faltante
         FROM insumo
        WHERE activo AND stock <= stock_minimo
        ORDER BY (stock - stock_minimo), nombre`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// GET /api/reports/sales          (hoy)
// GET /api/reports/sales?desde=…&hasta=…   (rango)
// ---------------------------------------------------------------------
router.get('/sales', auth(['empleado', 'admin']), async (req, res, next) => {
  try {
    const desde = req.query.desde || null;
    const hasta = req.query.hasta || null;
    const { rows } = await db.query(
      `SELECT p.creado_en::date AS dia,
              pg.metodo,
              COUNT(DISTINCT p.id) AS pedidos,
              SUM(pg.monto)        AS total
         FROM pedido p
         JOIN pago pg ON pg.pedido_id = p.id
        WHERE p.estado <> 'cancelado'
          AND p.creado_en >= COALESCE($1::date, CURRENT_DATE)
          AND p.creado_en <  COALESCE($2::date, CURRENT_DATE) + interval '1 day'
        GROUP BY dia, pg.metodo
        ORDER BY dia DESC, pg.metodo`,
      [desde, hasta]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
