// =====================================================================
//  PISTOLET · Registro público de clientes
//    POST /api/register  { nombre, email, password, telefono? }
//    → { user: { id, nombre, email, rol } }
//
//  Solo crea usuarios con rol 'cliente'. El personal lo da de alta
//  el administrador desde /api/users.
// =====================================================================
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { nombre, email, password, telefono } = req.body ?? {};

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
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
       VALUES ($1, $2, $3, $4, 'cliente')
       RETURNING id, nombre, email, rol`,
      [nombre, email, telefono || null, hash]
    );

    res.status(201).json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
