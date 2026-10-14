// =====================================================================
//  PISTOLET · Productos (catálogo + CRUD para el panel admin)
//
//  GET    /api/productos?q=&page=&pageSize=   → lista paginada
//  GET    /api/productos/:id                  → un producto
//  POST   /api/productos                      → crear        (staff)
//  PUT    /api/productos/:id                  → actualizar   (staff)
//  DELETE /api/productos/:id                  → baja lógica  (staff)
//
//  POST/PUT aceptan multipart/form-data con un campo `imagen` (archivo).
//  Si no se envía archivo, se usa el campo de texto `imagen` (nombre de
//  archivo ya existente en /img/productos/pan/ o una URL completa).
// =====================================================================
const { Router } = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const db = require('../db');

const router = Router();

// ---------------------------------------------------------------------
// GET /api/productos   (público)
// ---------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim().slice(0, 100);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(60, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const { rows } = await db.query(
      `SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock,
              p.stock_minimo, p.unidad, p.imagen, p.categoria_id,
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

// ---------------------------------------------------------------------
// GET /api/productos/:id   (público)
// ---------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock,
              p.stock_minimo, p.unidad, p.imagen, p.categoria_id,
              c.nombre AS categoria
         FROM producto p
         LEFT JOIN categoria c ON c.id = p.categoria_id
        WHERE p.id = $1 AND p.activo`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// POST /api/productos   (staff)
// ---------------------------------------------------------------------
router.post('/', auth(['empleado', 'admin']), upload.single('imagen'), async (req, res, next) => {
  try {
    const { nombre, descripcion, precio, stock, stock_minimo, unidad, categoria_id } = req.body ?? {};
    if (!nombre || precio === undefined || precio === '') {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }
    const imagen = req.file ? req.file.filename : (req.body.imagen || null);

    const { rows } = await db.query(
      `INSERT INTO producto
         (nombre, descripcion, precio, stock, stock_minimo, unidad, categoria_id, imagen)
       VALUES ($1, $2, $3, COALESCE($4, 0), COALESCE($5, 0), COALESCE($6, 'pieza'), $7, $8)
       RETURNING id`,
      [nombre, descripcion || null, precio, stock, stock_minimo, unidad, categoria_id || null, imagen]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// PUT /api/productos/:id   (staff)
// ---------------------------------------------------------------------
router.put('/:id', auth(['empleado', 'admin']), upload.single('imagen'), async (req, res, next) => {
  try {
    const { nombre, descripcion, precio, stock, stock_minimo, unidad, categoria_id } = req.body ?? {};
    const imagen = req.file ? req.file.filename : (req.body.imagen ?? null);

    const { rowCount } = await db.query(
      `UPDATE producto
          SET nombre       = COALESCE($1, nombre),
              descripcion  = $2,
              precio       = COALESCE($3, precio),
              stock        = COALESCE($4, stock),
              stock_minimo = COALESCE($5, stock_minimo),
              unidad       = COALESCE($6, unidad),
              categoria_id = $7,
              imagen       = COALESCE($8, imagen)
        WHERE id = $9 AND activo`,
      [nombre, descripcion || null, precio, stock, stock_minimo, unidad, categoria_id || null, imagen, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// DELETE /api/productos/:id   (staff, baja lógica)
// ---------------------------------------------------------------------
router.delete('/:id', auth(['empleado', 'admin']), async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'UPDATE producto SET activo = false WHERE id = $1 AND activo',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
