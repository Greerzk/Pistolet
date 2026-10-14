// =====================================================================
//  PISTOLET · Login con JWT
//    POST /api/login  { email, password }
//    → { accessToken, refreshToken, user: { id, nombre, rol } }
//    → 403 { codigo: 'CUENTA_ELIMINADA' } si la cuenta fue dada de baja
//
//  · Contraseña verificada con bcrypt (nunca en texto plano).
//  · El refresh token se guarda HASHEADO (SHA-256) en la tabla 'sesion'.
//  · NUNCA se regresa password_hash al cliente.
// =====================================================================
const crypto = require('crypto');
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = Router();

// Validez del access token (el refresh dura 30 días, ver INSERT abajo)
const ACCESS_TOKEN_MINUTOS = 15;

router.post('/', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    // Traemos también las cuentas dadas de baja (activo = false) para poder
    // avisarle al usuario si intenta entrar con una cuenta ya eliminada.
    const { rows } = await db.query(
      `SELECT id, nombre, rol, activo, password_hash
         FROM usuario
        WHERE lower(email) = lower($1)`,
      [email]
    );
    const user = rows[0];

    // Mensaje genérico: no revela si el correo existe o no. Comparamos la
    // contraseña SIEMPRE (aunque la cuenta esté de baja) para no filtrar la
    // existencia del correo salvo cuando las credenciales son correctas.
    const valido = user && (await bcrypt.compare(password, user.password_hash));
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Credenciales correctas pero cuenta dada de baja: avisamos para que el
    // cliente pueda reactivarla volviendo a registrarse con el mismo correo.
    if (!user.activo) {
      return res.status(403).json({
        codigo: 'CUENTA_ELIMINADA',
        error:
          user.rol === 'cliente'
            ? 'Esta cuenta fue eliminada. Vuelve a registrarte con este correo para reactivarla.'
            : 'Esta cuenta está desactivada. Contacta al administrador.',
      });
    }

    const accessToken = jwt.sign(
      { sub: user.id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: `${ACCESS_TOKEN_MINUTOS}m` }
    );

    const refreshToken = crypto.randomBytes(48).toString('base64url');
    await db.query(
      `INSERT INTO sesion (usuario_id, token_hash, expira_en)
       VALUES ($1, $2, now() + interval '30 days')`,
      [user.id, crypto.createHash('sha256').update(refreshToken).digest('hex')]
    );

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, nombre: user.nombre, rol: user.rol },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;