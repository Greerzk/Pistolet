// =====================================================================
//  PISTOLET · Configuración de entorno (DESARROLLO)
//
//  Por defecto apunta al backend desplegado en Render, que comparte la
//  MISMA base de datos (Neon) que la app móvil: así `ng serve` funciona
//  sin tener que levantar el backend en local.
//
//  Si vas a probar un backend local, cambia apiUrl/imgUrl a:
//      http://localhost:3000/api  y  http://localhost:3000/img
// =====================================================================
export const environment = {
  production: false,
  apiUrl: 'https://pistolet-api.onrender.com/api',
  imgUrl: 'https://pistolet-api.onrender.com/img',
};
