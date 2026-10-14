// =====================================================================
//  PISTOLET · Perfil del usuario autenticado
//    GET /api/me  → { id, nombre, email, telefono, rol, creado_en }
//
//  Lo usa la app móvil para pintar la pantalla de perfil con datos
//  frescos (el login solo devuelve id, nombre y rol).
//  NUNCA se regresa password_hash.
// =====================================================================
const { Router } = require('express');
const auth = require('../middleware/auth');
const db = require('../db');

const router = Router();

router.get('/', auth(), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nombre, email, telefono, rol, creado_en
         FROM usuario
        WHERE id = $1 AND activo`,
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
