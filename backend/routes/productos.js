// =====================================================================
//  PISTOLET · Catálogo de productos (búsqueda + paginación server-side)
//
//  GET /api/productos?q=concha&page=1&pageSize=20
//
//  · q        → busca por nombre (aprovecha ix_producto_nombre_trgm)
//  · page     → inicia en 1
//  · pageSize → máximo 60
//
//  Respuesta:
//    { data: [{id, nombre, precio, stock, imagen, categoria}],
//      page, pageSize, total, totalPages }
// =====================================================================
const { Router } = require('express');
const db = require('../db');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim().slice(0, 100);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(60, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    // COUNT(*) OVER() trae el total de la fila filtrada en la misma
    // consulta, sin necesidad de una segunda llamada a la BD.
    const { rows } = await db.query(
      `SELECT p.id, p.nombre, p.precio, p.stock, p.imagen,
              c.nombre AS categoria,
              COUNT(*) OVER() AS total
         FROM producto p
         LEFT JOIN categoria c ON c.id = p.categoria_id
        WHERE p.activo
          AND ($1 = '' OR p.nombre ILIKE '%' || $1 || '%')
        ORDER BY p.nombre
        LIMIT $2 OFFSET $3`,
      [q, pageSize, offset]
    );

    const total = rows.length ? Number(rows[0].total) : 0;
    const data = rows.map(({ total: _total, ...rest }) => rest);

    res.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;