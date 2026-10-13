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

const entorno = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

export const API_URL = entorno?.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

export const API_PRODUCTOS = `${API_URL}/api/productos`;
export const API_LOGIN = `${API_URL}/api/login`;
export const API_PEDIDOS = `${API_URL}/api/pedidos`;

// Ruta pública de imágenes de productos (web de la panadería)
export const IMAGENES_PRODUCTOS = `${API_URL}/img/productos/pan`;