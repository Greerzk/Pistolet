// =====================================================================
//  PISTOLET · Configuración de entorno (PRODUCCIÓN)
//
//  Este archivo reemplaza a environment.ts al hacer `ng build`
//  (ver fileReplacements en angular.json). Apunta al backend en Render,
//  mismo backend y misma base de datos (Neon) que la app móvil.
// =====================================================================
export const environment = {
  production: true,
  apiUrl: 'https://pistolet-api.onrender.com/api',
  imgUrl: 'https://pistolet-api.onrender.com/img',
};
