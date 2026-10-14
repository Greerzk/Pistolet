// =====================================================================
//  PISTOLET · Configuración de la API
//
//  Por defecto apuntamos al backend YA DESPLEGADO en Render, para que la
//  app funcione de inmediato en el celular con Expo Go y en el APK, sin
//  configurar nada.
//
//  Para usar un backend LOCAL en desarrollo, sobrescribe la variable al
//  arrancar Expo con la IP de tu PC en la red local (ipconfig):
//     EXPO_PUBLIC_API_URL=http://192.168.1.10:3000 npx expo start
//
//  En el build de producción (Vercel / EAS) la variable se incrusta al
//  compilar, así que no hay que editar el código para cambiar de entorno.
// =====================================================================

const DEFAULT_API_URL = 'https://pistolet-api.onrender.com';

// Render (plan free) "duerme" tras ~15 min de inactividad y el primer
// request puede tardar 30-50 s. Damos margen para no fallar en frío.
export const API_TIMEOUT_MS = 60000;

// Importante: escribe la expresión LITERAL `process.env.EXPO_PUBLIC_API_URL`.
// Expo la reemplaza por su valor al compilar; si se accede de otra forma
// (p. ej. `globalThis.process`), no la incrusta y en web `process` es
// undefined, por lo que la app caería al valor por defecto (Render).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

export const API_PRODUCTOS = `${API_URL}/api/productos`;
export const API_LOGIN = `${API_URL}/api/login`;
export const API_PEDIDOS = `${API_URL}/api/pedidos`;

// Ruta pública de imágenes de productos (web de la panadería)
export const IMAGENES_PRODUCTOS = `${API_URL}/img/productos/pan`;