// =====================================================================
//  PISTOLET · Registro público de clientes
//    POST /api/register  { nombre, email, password, telefono? }
//    → { user: { id, nombre, email, rol } }            (cuenta nueva)
//    → { user: {...}, reactivado: true }               (cliente dado de baja)
//
//  Solo crea usuarios con rol 'cliente'. El personal lo da de alta
//  el administrador desde /api/users.
//  Si el correo pertenece a un cliente que eliminó su cuenta (activo = false),
//  se reactiva en lugar de rechazarse, para permitir volver a registrarse.
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
      'SELECT id, rol, activo FROM usuario WHERE lower(email) = lower($1)',
      [email]
    );
    const previo = existe.rows[0];

    // El correo pertenece a una cuenta ACTIVA, o a una cuenta de personal
    // (empleado/admin) dada de baja: en ambos casos no se registra desde aquí.
    if (previo && (previo.activo || previo.rol !== 'cliente')) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const hash = await bcrypt.hash(String(password), 10);

    // El correo era de un cliente dado de baja (activo = false): reactivamos
    // su cuenta con los datos nuevos, en vez de rechazarlo. Así un cliente que
    // eliminó su cuenta puede volver a registrarse con el mismo correo.
    if (previo) {
      const { rows } = await db.query(
        `UPDATE usuario
            SET nombre = $1, telefono = $2, password_hash = $3,
                activo = true, actualizado_en = now()
          WHERE id = $4
          RETURNING id, nombre, email, rol`,
        [nombre, telefono || null, hash, previo.id]
      );
      return res.json({ user: rows[0], reactivado: true });
    }

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
