// =====================================================================
//  PISTOLET · Almacenamiento de imágenes en Cloudinary
//
//  Guardamos los archivos en Cloudinary (no en disco ni en la base de
//  datos) y en Postgres solo la URL y el public_id. Esto evita el
//  problema del disco EFÍMERO de Render: las imágenes sobreviven a los
//  redespliegues.
//
//  Variables de entorno (.env / Render):
//    CLOUDINARY_CLOUD_NAME
//    CLOUDINARY_API_KEY
//    CLOUDINARY_API_SECRET
//
//  Si no están configuradas, `configurado` es false y las rutas que
//  suben imágenes responden 503 con un mensaje claro.
// =====================================================================
const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const configurado = Boolean(cloudName && apiKey && apiSecret);

if (configurado) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

// Sube un Buffer (multer memoryStorage) a Cloudinary.
// `opciones` es lo mismo que acepta cloudinary.uploader.upload.
function subirBuffer(buffer, opciones = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(opciones, (error, resultado) => {
      if (error) return reject(error);
      resolve(resultado);
    });
    stream.end(buffer);
  });
}

// Borra un recurso por su public_id. No falla si ya no existe.
async function eliminar(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Si el recurso ya no existe o Cloudinary no responde, no rompemos la
    // operación principal (p. ej. quitar la foto o eliminar la cuenta).
  }
}

module.exports = { cloudinary, configurado, subirBuffer, eliminar };
