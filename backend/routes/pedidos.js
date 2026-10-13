// =====================================================================
//  PISTOLET · API de pedidos
//    POST   /              crear pedido (cliente)
//    GET    /              lista de pedidos (el cliente ve los suyos;
//                          empleado/admin ven todos, pendientes primero)
//    GET    /:id           detalle con líneas (propietario o staff)
//    POST   /:id/pagar     cobro en mostrador (staff)  -> registrar_pago()
//    POST   /:id/cancelar  cancelar (cliente si es suyo, o staff)
//    PATCH  /:id/estado    avanzar estados (staff)
//
//  Toda la lógica de negocio vive en los procedimientos almacenados;
//  aquí solo se valida el rol y se traducen los mensajes de error.
// =====================================================================
const { Router } = require('express');
const auth = require('../middleware/auth');
const db = require('../db');

const router = Router();

const ESTADOS_VALIDOS = ['confirmado', 'en_preparacion', 'listo', 'entregado'];

// ---------------------------------------------------------------------
// POST /api/pedidos
// Body: { items: [{producto_id, cantidad}], notas?: string }
// ---------------------------------------------------------------------
router.post('/', auth(), async (req, res, next) => {
  try {
    const { items, notas } = req.body;
    const { rows } = await db.query(
      `SELECT * FROM crear_pedido($1, $2::jsonb, $3) AS pedido_id`,
      [req.user.id, JSON.stringify(items ?? []), notas ?? null]
    );
    res.status(201).json({ pedido_id: rows[0].pedido_id });
  } catch (err) {
    next(err); // el error handler traduce RAISE EXCEPTION a un 400 legible
  }
});

// ---------------------------------------------------------------------
// GET /api/pedidos
// ---------------------------------------------------------------------
router.get('/', auth(), async (req, res, next) => {
  try {
    const isStaff = ['empleado', 'admin'].includes(req.user.rol);
    const params = [];
    let sql = `
      SELECT p.id, p.folio, p.estado, p.subtotal, p.descuento,
             p.total, p.notas, p.creado_en, u.nombre AS cliente
      FROM pedido p
      JOIN usuario u ON u.id = p.usuario_id`;

    if (!isStaff) {
      sql += ` WHERE p.usuario_id = $1`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY
               CASE p.estado
                 WHEN 'pendiente' THEN 0 WHEN 'confirmado' THEN 1
                 WHEN 'en_preparacion' THEN 2 WHEN 'listo' THEN 3
                 WHEN 'entregado' THEN 4 ELSE 5
               END,
               p.creado_en DESC
             LIMIT $${params.length + 1}`;
    params.push(100);

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// GET /api/pedidos/:id
// ---------------------------------------------------------------------
router.get('/:id', auth(), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.folio, p.estado, p.usuario_id, p.subtotal, p.descuento,
              p.total, p.notas, p.creado_en, u.nombre AS cliente,
              COALESCE(
                json_agg(
                  json_build_object(
                    'producto_id',     pr.id,
                    'nombre',          pr.nombre,
                    'cantidad',        d.cantidad,
                    'precio_unitario', d.precio_unitario,
                    'subtotal',        d.subtotal
                  )
                ) FILTER (WHERE d.id IS NOT NULL), '[]'
              ) AS lineas
         FROM pedido p
         JOIN usuario u ON u.id = p.usuario_id
         LEFT JOIN pedido_detalle d  ON d.pedido_id = p.id
         LEFT JOIN producto pr       ON pr.id = d.producto_id
        WHERE p.id = $1
        GROUP BY p.id, u.nombre`,
      [req.params.id]
    );

    const pedido = rows[0];
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Un cliente solo puede ver sus propios pedidos
    if (req.user.rol === 'cliente' && pedido.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No puedes ver este pedido' });
    }

    res.json(pedido);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// POST /api/pedidos/:id/pagar
// Body: { metodo: 'efectivo' | 'tarjeta', monto: number }
// ---------------------------------------------------------------------
router.post('/:id/pagar', auth(['empleado', 'admin']), async (req, res, next) => {
  try {
    const { metodo, monto } = req.body;
    const { rows } = await db.query(
      `SELECT registrar_pago($1, $2::metodo_pago, $3::numeric, $4) AS ok`,
      [req.params.id, metodo, monto, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// POST /api/pedidos/:id/cancelar
// ---------------------------------------------------------------------
router.post('/:id/cancelar', auth(), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT usuario_id FROM pedido WHERE id = $1', [req.params.id]
    );
    const pedido = rows[0];
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    if (req.user.rol === 'cliente' && pedido.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No puedes cancelar este pedido' });
    }

    await db.query('SELECT cancelar_pedido($1)', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// PATCH /api/pedidos/:id/estado   (staff)
// Body: { estado: 'confirmado' | 'en_preparacion' | 'listo' | 'entregado' }
// ---------------------------------------------------------------------
router.patch('/:id/estado', auth(['empleado', 'admin']), async (req, res, next) => {
  try {
    const { estado } = req.body;
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    await db.query('UPDATE pedido SET estado = $1 WHERE id = $2', [estado, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;