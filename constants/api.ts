// =====================================================================
//  PISTOLET · Configuración de la API
//
//  En DESARROLLO usa la IP de tu PC en la red local (ipconfig).
//  En PRODUCCIÓN define la variable EXPO_PUBLIC_API_URL al compilar,
//  por ejemplo:
//     EXPO_PUBLIC_API_URL=https://api.pistolet.mx npx expo export ...
//  Así no hay que editar el código para cambiar de entorno.
// =====================================================================

const DEFAULT_API_URL = 'http://192.168.1.10:3000';

// Importante: escribe la expresión LITERAL `process.env.EXPO_PUBLIC_API_URL`.
// Expo la reemplaza por su valor al compilar; si se accede de otra forma
// (p. ej. `globalThis.process`), no la incrusta y en web `process` es
// undefined, por lo que la app caería al valor por defecto de desarrollo.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

export const API_PRODUCTOS = `${API_URL}/api/productos`;
export const API_LOGIN = `${API_URL}/api/login`;
export const API_PEDIDOS = `${API_URL}/api/pedidos`;

// Ruta pública de imágenes de productos (web de la panadería)
export const IMAGENES_PRODUCTOS = `${API_URL}/img/productos/pan`;