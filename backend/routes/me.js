// =====================================================================
//  PISTOLET · Perfil del usuario autenticado
//    GET    /api/me           → { id, nombre, email, telefono, rol, creado_en }
//    PUT    /api/me           → actualiza nombre, email y teléfono
//    PUT    /api/me/password  → cambia la contraseña (verifica la actual)
//    DELETE /api/me           → el propio usuario elimina su cuenta (baja lógica)
//
//  Lo usan la web y la app móvil para pintar y editar la misma
//  información de la cuenta. NUNCA se regresa password_hash.
// =====================================================================
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const db = require('../db');

const router = Router();

// Campos que se devuelven siempre al cliente (sin datos sensibles).
const CAMPOS_PERFIL = 'id, nombre, email, telefono, rol, creado_en';

// Correo con formato razonable: algo@algo.algo
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Ver mi perfil ----------
router.get('/', auth(), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${CAMPOS_PERFIL}
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

// ---------- Editar mi perfil ----------
router.put('/', auth(), async (req, res, next) => {
  try {
    const nombre = String(req.body?.nombre ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    // El teléfono es opcional: cadena vacía se guarda como NULL.
    const telefonoCrudo = req.body?.telefono;
    const telefono =
      telefonoCrudo === undefined || telefonoCrudo === null
        ? null
        : String(telefonoCrudo).trim();

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (nombre.length > 120) {
      return res.status(400).json({ error: 'El nombre es demasiado largo' });
    }
    if (!email) {
      return res.status(400).json({ error: 'El correo es obligatorio' });
    }
    if (!RE_CORREO.test(email) || email.length > 160) {
      return res.status(400).json({ error: 'El correo no tiene un formato válido' });
    }
    if (telefono && telefono.length > 20) {
      return res.status(400).json({ error: 'El teléfono es demasiado largo' });
    }

    // El correo no puede repetirse entre usuarios (se compara sin distinguir
    // mayúsculas, igual que el índice único ux_usuario_email).
    const repetido = await db.query(
      'SELECT 1 FROM usuario WHERE lower(email) = lower($1) AND id <> $2',
      [email, req.user.id]
    );
    if (repetido.rowCount) {
      return res.status(400).json({ error: 'Ese correo ya está registrado por otra cuenta' });
    }

    const { rows } = await db.query(
      `UPDATE usuario
          SET nombre = $1,
              email = $2,
              telefono = $3,
              actualizado_en = now()
        WHERE id = $4 AND activo
        RETURNING ${CAMPOS_PERFIL}`,
      [nombre, email, telefono || null, req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------- Cambiar mi contraseña ----------
router.put('/password', auth(), async (req, res, next) => {
  try {
    const passwordActual = String(req.body?.password_actual ?? '');
    const passwordNueva = String(req.body?.password_nueva ?? '');

    if (!passwordActual || !passwordNueva) {
      return res
        .status(400)
        .json({ error: 'La contraseña actual y la nueva son obligatorias' });
    }
    if (passwordNueva.length < 6) {
      return res
        .status(400)
        .json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const { rows } = await db.query(
      'SELECT password_hash FROM usuario WHERE id = $1 AND activo',
      [req.user.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const coincide = await bcrypt.compare(passwordActual, rows[0].password_hash);
    if (!coincide) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }

    const hash = await bcrypt.hash(passwordNueva, 10);
    await db.query(
      'UPDATE usuario SET password_hash = $1, actualizado_en = now() WHERE id = $2',
      [hash, req.user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------- Eliminar mi cuenta (baja lógica) ----------
// El propio usuario da de baja su cuenta. Se marca activo = false (igual que
// la baja del panel admin) en vez de borrar la fila: los pedidos del cliente
// tienen FK ON DELETE RESTRICT y además son historial del negocio.
// En la misma operación revocamos todas sus sesiones para que el refresh
// token deje de ser válido de inmediato.
router.delete('/', auth(), async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'UPDATE usuario SET activo = false, actualizado_en = now() WHERE id = $1 AND activo',
      [req.user.id]
    );

    if (!rowCount) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await db.query('UPDATE sesion SET revocada = true WHERE usuario_id = $1', [
      req.user.id,
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
