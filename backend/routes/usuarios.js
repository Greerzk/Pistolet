// =====================================================================
//  PISTOLET · Usuarios — CRUD para el panel admin
//    GET    /api/users        → lista
//    POST   /api/users        → crear (con contraseña)
//    PUT    /api/users/:id    → actualizar (contraseña opcional)
//    DELETE /api/users/:id    → baja lógica (activo = false)
//
//  Solo accesible por rol 'admin'.
// =====================================================================
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const db = require('../db');

const router = Router();

const ROLES = ['cliente', 'empleado', 'admin'];

// ---------------------------------------------------------------------
// GET /api/users
// ---------------------------------------------------------------------
router.get('/', auth(['admin']), async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, email, telefono, rol, activo, creado_en
         FROM usuario
        ORDER BY rol, nombre`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// POST /api/users
// Body: { nombre, email, password, rol, telefono? }
// ---------------------------------------------------------------------
router.post('/', auth(['admin']), async (req, res, next) => {
  try {
    const { nombre, email, password, rol, telefono } = req.body ?? {};
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }
    if (rol && !ROLES.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const existe = await db.query(
      'SELECT 1 FROM usuario WHERE lower(email) = lower($1)',
      [email]
    );
    if (existe.rowCount) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const { rows } = await db.query(
      `INSERT INTO usuario (nombre, email, telefono, password_hash, rol)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'cliente'))
       RETURNING id, nombre, email, rol`,
      [nombre, email, telefono || null, hash, rol || null]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// PUT /api/users/:id
// Body: { nombre?, email?, rol?, telefono?, password? }
// ---------------------------------------------------------------------
router.put('/:id', auth(['admin']), async (req, res, next) => {
  try {
    const { nombre, email, rol, telefono, password } = req.body ?? {};
    if (rol && !ROLES.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Evita que un admin se quite a sí mismo el rol de admin.
    if (String(req.params.id) === String(req.user.id) && rol && rol !== 'admin') {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }

    let hash = null;
    if (password) hash = await bcrypt.hash(String(password), 10);

    const { rowCount } = await db.query(
      `UPDATE usuario
          SET nombre        = COALESCE($1, nombre),
              email         = COALESCE($2, email),
              telefono      = $3,
              rol           = COALESCE($4, rol),
              password_hash = COALESCE($5, password_hash)
        WHERE id = $6 AND activo`,
      [nombre, email, telefono || null, rol || null, hash, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// DELETE /api/users/:id   (baja lógica)
// ---------------------------------------------------------------------
router.delete('/:id', auth(['admin']), async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }
    const { rowCount } = await db.query(
      'UPDATE usuario SET activo = false WHERE id = $1 AND activo',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
