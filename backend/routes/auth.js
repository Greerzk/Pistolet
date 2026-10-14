// =====================================================================
//  PISTOLET · Renovación y cierre de sesión JWT
//    POST /api/auth/refresh   -> nuevo access token con refresh token
//    POST /api/auth/logout    -> revoca la sesión (refresh token hash)
// =====================================================================
const crypto = require('crypto');
const { Router } = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = Router();

const sha256 = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

// ---------------------------------------------------------------------
// POST /api/auth/refresh
// Body: { refreshToken: string }
// ---------------------------------------------------------------------
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const { rows } = await db.query(
      `SELECT s.id, s.usuario_id, u.rol
         FROM sesion s
         JOIN usuario u ON u.id = s.usuario_id
        WHERE s.token_hash = $1
          AND NOT s.revocada
          AND s.expira_en > now()
          AND u.activo`,
      [sha256(String(refreshToken ?? ''))]
    );

    const session = rows[0];
    if (!session) {
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }

    const accessToken = jwt.sign(
      { sub: session.usuario_id, rol: session.rol },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// POST /api/auth/logout
// Body: { refreshToken: string }
// ---------------------------------------------------------------------
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await db.query(
      'UPDATE sesion SET revocada = true WHERE token_hash = $1',
      [sha256(String(refreshToken ?? ''))]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;