// =====================================================================
//  PISTOLET · Middleware de autenticación JWT
//  Use: router.get('/', auth(), ...)
//       router.post('/x', auth(['empleado', 'admin']), ...)
//
//  El token se emite en /api/login con:  { sub: user.id, rol: user.rol }
// =====================================================================
const jwt = require('jsonwebtoken');

module.exports = function auth(rolesPermitidos = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.sub, rol: payload.rol };

      if (rolesPermitidos.length && !rolesPermitidos.includes(payload.rol)) {
        return res.status(403).json({ error: 'Sin permisos para esta operación' });
      }

      next();
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
};