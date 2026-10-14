// =====================================================================
//  PISTOLET · Subida de imágenes de productos (multer)
//
//  Guarda los archivos en  backend/public/img/productos/pan/
//  y el API los publica en  /img/productos/pan/<archivo>
//
//  AVISO: en Render (plan free) el disco es EFÍMERO: las imágenes
//  subidas en caliente se pierden al redesplegar. Para producción
//  conviene mover esto a almacenamiento externo (Cloudinary/S3) más
//  adelante. Mientras tanto, también se acepta un campo `imagen` con
//  una URL o nombre de archivo ya existente en esa carpeta.
// =====================================================================
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const DIRECTORIO = path.join(__dirname, '..', 'public', 'img', 'productos', 'pan');
fs.mkdirSync(DIRECTORIO, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DIRECTORIO),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10) || '.jpg';
    const sufijo = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `producto-${sufijo}${ext}`);
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('Solo se permiten archivos de imagen'));
  },
});
