// =====================================================================
//  PISTOLET · Subida de foto de perfil (multer, EN MEMORIA)
//
//  A diferencia de las imágenes de producto (que van a disco), la foto
//  de perfil se mantiene en memoria y se reenvía a Cloudinary, para que
//  sobreviva a los redespliegues de Render (disco efímero).
//
//  Límite: 5 MB, solo archivos de imagen.
// =====================================================================
const multer = require('multer');

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('Solo se permiten archivos de imagen'));
  },
});
