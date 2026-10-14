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
        WHERE activo
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
      'SELECT id, activo FROM usuario WHERE lower(email) = lower($1)',
      [email]
    );
    const previo = existe.rows[0];
    if (previo && previo.activo) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const hash = await bcrypt.hash(String(password), 10);
    // OJO: 'rol' es del tipo ENUM rol_usuario. Sin el cast explícito,
    // COALESCE($5, 'cliente') resuelve a text y PostgreSQL rechaza la
    // asignación ("column rol is of type rol_usuario but expression is of type text").
    //
    // Si el correo pertenecía a un usuario dado de baja (activo = false), lo
    // reactivamos en lugar de insertar, para poder volver a dar de alta el mismo
    // correo (el índice único es sobre lower(email), sin importar 'activo').
    const sql = previo
      ? `UPDATE usuario
            SET nombre = $1, email = $2, telefono = $3, password_hash = $4,
                rol = COALESCE($5::rol_usuario, 'cliente'::rol_usuario),
                activo = true
          WHERE id = $6
          RETURNING id, nombre, email, rol`
      : `INSERT INTO usuario (nombre, email, telefono, password_hash, rol)
         VALUES ($1, $2, $3, $4, COALESCE($5::rol_usuario, 'cliente'::rol_usuario))
         RETURNING id, nombre, email, rol`;
    const params = previo
      ? [nombre, email, telefono || null, hash, rol || null, previo.id]
      : [nombre, email, telefono || null, hash, rol || null];

    const { rows } = await db.query(sql, params);
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
              telefono      = COALESCE($3, telefono),
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
