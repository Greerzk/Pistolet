// =====================================================================
//  PISTOLET · Perfil del usuario autenticado
//    GET    /api/me           → { id, nombre, email, telefono, rol, avatar_url, creado_en }
//    PUT    /api/me           → actualiza nombre, email y teléfono
//    PUT    /api/me/password  → cambia la contraseña (verifica la actual)
//    POST   /api/me/avatar    → sube/reemplaza la foto de perfil (multipart `imagen`)
//    DELETE /api/me/avatar    → quita la foto de perfil
//    DELETE /api/me           → el propio usuario elimina su cuenta (baja lógica)
//
//  Lo usan la web y la app móvil para pintar y editar la misma
//  información de la cuenta. NUNCA se regresa password_hash.
//
//  La foto de perfil se guarda en Cloudinary; en la tabla solo viven
//  avatar_url y avatar_public_id (ver backend/lib/cloudinary.js).
// =====================================================================
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const uploadAvatar = require('../middleware/uploadAvatar');
const { configurado, subirBuffer, eliminar } = require('../lib/cloudinary');
const db = require('../db');

const router = Router();

// Campos que se devuelven siempre al cliente (sin datos sensibles).
const CAMPOS_PERFIL = 'id, nombre, email, telefono, rol, avatar_url, creado_en';

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

// ---------- Subir / reemplazar mi foto de perfil ----------
// Recibe multipart/form-data con el campo `imagen`. La imagen se sube a
// Cloudinary (recortada a 1000x1000) y guardamos solo la URL y el public_id.
router.post('/avatar', auth(), uploadAvatar.single('imagen'), async (req, res, next) => {
  try {
    if (!configurado) {
      return res.status(503).json({
        error: 'El servicio de imágenes no está configurado. Intenta más tarde.',
      });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }

    // public_id actual para borrar la foto anterior si existía.
    const { rows: previos } = await db.query(
      'SELECT avatar_public_id FROM usuario WHERE id = $1 AND activo',
      [req.user.id]
    );
    if (!previos[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // El public_id incluye la marca de tiempo: así la URL cambia en cada
    // subida (el navegador no muestra la foto anterior) y cada archivo es
    // único.
    let subida;
    try {
      subida = await subirBuffer(req.file.buffer, {
        folder: 'pistolet/avatares',
        public_id: `avatar_${req.user.id}_${Date.now()}`,
        resource_type: 'image',
        // Una sola medida: cuadrada de 1000x1000, centrada en el rostro.
        transformation: [{ width: 1000, height: 1000, crop: 'fill', gravity: 'auto' }],
      });
    } catch {
      return res
        .status(502)
        .json({ error: 'No se pudo subir la imagen. Intenta de nuevo en un momento.' });
    }

    const { rows } = await db.query(
      `UPDATE usuario
          SET avatar_url = $1, avatar_public_id = $2, actualizado_en = now()
        WHERE id = $3 AND activo
        RETURNING ${CAMPOS_PERFIL}`,
      [subida.secure_url, subida.public_id, req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Borramos la foto anterior (ya tenemos la nueva guardada).
    if (previos[0].avatar_public_id && previos[0].avatar_public_id !== subida.public_id) {
      await eliminar(previos[0].avatar_public_id);
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------- Quitar mi foto de perfil ----------
router.delete('/avatar', auth(), async (req, res, next) => {
  try {
    const { rows: previos } = await db.query(
      'SELECT avatar_public_id FROM usuario WHERE id = $1 AND activo',
      [req.user.id]
    );
    if (!previos[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { rows } = await db.query(
      `UPDATE usuario
          SET avatar_url = NULL, avatar_public_id = NULL, actualizado_en = now()
        WHERE id = $1 AND activo
        RETURNING ${CAMPOS_PERFIL}`,
      [req.user.id]
    );

    if (configurado && previos[0].avatar_public_id) {
      await eliminar(previos[0].avatar_public_id);
    }

    res.json(rows[0]);
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
    const { rows } = await db.query(
      `UPDATE usuario
          SET activo = false, actualizado_en = now()
        WHERE id = $1 AND activo
        RETURNING avatar_public_id`,
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await db.query('UPDATE sesion SET revocada = true WHERE usuario_id = $1', [
      req.user.id,
    ]);

    // La foto de perfil es dato personal: la borramos también de Cloudinary.
    if (configurado && rows[0].avatar_public_id) {
      await eliminar(rows[0].avatar_public_id);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
