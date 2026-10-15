// =====================================================================
//  PISTOLET · Sesión JWT + cliente axios autenticado
//
//  · 'guardarSesion' persiste tokens (SecureStore en iOS/Android,
//    localStorage en web para que la sesión sobreviva recargas).
//  · El interceptor agrega el access token a cada request.
//  · Si el servidor responde 401, renueva el access token con el
//    refresh token una sola vez y reintenta la request original.
// =====================================================================
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_ME, API_ME_AVATAR, API_REGISTER, API_TIMEOUT_MS, API_URL } from '@/constants/api';

const KEY_SESSION = 'pistolet.session';

export type Sesion = {
  accessToken: string;
  refreshToken: string;
  user: { id: number; nombre: string; rol: string; avatar_url?: string | null };
};

// Datos que regresa GET /api/me (pantalla de perfil).
export type Perfil = {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  avatar_url: string | null;
  creado_en: string;
};

let cache: Sesion | null = null;

async function guardar(key: string, value: string) {
  if (Platform.OS === 'web') {
    // En web la sesión vive en localStorage: sobrevive recargas
    // (F5) y pestañas. SecureStore no existe en web.
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function obtener(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function borrar(key: string) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// ---------- API pública de sesión ----------

export async function cargarSesion(): Promise<Sesion | null> {
  if (cache) return cache;
  try {
    const raw = await obtener(KEY_SESSION);
    cache = raw ? JSON.parse(raw) : null;
  } catch {
    cache = null;
  }
  return cache;
}

export async function guardarSesion(sesion: Sesion) {
  cache = sesion;
  await guardar(KEY_SESSION, JSON.stringify(sesion));
}

export async function actualizarAccessToken(accessToken: string) {
  const actual = (await cargarSesion()) as Sesion | null;
  if (!actual) return;
  await guardarSesion({ ...actual, accessToken });
}

// Refresca los datos del usuario dentro de la sesión guardada (nombre y
// foto de perfil). Lo llama la pantalla de perfil después de guardar, así
// el círculo del header del catálogo se actualiza al instante.
export async function actualizarUsuarioSesion(cambios: Partial<Sesion['user']>) {
  const actual = await cargarSesion();
  if (!actual) return;
  await guardarSesion({ ...actual, user: { ...actual.user, ...cambios } });
}

export async function cerrarSesion() {
  cache = null;
  await borrar(KEY_SESSION);
}

// ---------- Login ----------

export async function login(email: string, password: string): Promise<Sesion> {
  const { data } = await axios.post(`${API_URL}/api/login`, { email, password });
  if (!data.accessToken) {
    throw new Error('El backend debe regresar accessToken. Revisa /api/login.');
  }
  const sesion: Sesion = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
  await guardarSesion(sesion);
  return sesion;
}

// ---------- Registro público ----------

export async function registrarCliente(datos: {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
}): Promise<{
  user: { id: number; nombre: string; email: string; rol: string };
  // true cuando el correo era de un cliente dado de baja y se reactivó.
  reactivado?: boolean;
}> {
  const { data } = await axios.post(API_REGISTER, datos);
  return data;
}

// ---------- Axios autenticado ----------

export const api = axios.create({ timeout: API_TIMEOUT_MS });

api.interceptors.request.use(
  async (config) => {
    const sesion = await cargarSesion();
    if (sesion?.accessToken) {
      config.headers.Authorization = `Bearer ${sesion.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let renovando: Promise<string | null> | null = null;

async function renovarAccessToken(): Promise<string | null> {
  const sesion = await cargarSesion();
  if (!sesion?.refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
      refreshToken: sesion.refreshToken,
    });
    await actualizarAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    await cerrarSesion();
    return null;
  }
}

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error) => {
    const original = error.config as Record<string, unknown> & {
      headers: Record<string, string>;
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      renovando ??= renovarAccessToken();
      const token = await renovando.finally(() => {
        renovando = null;
      });
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

// ---------- Perfil del usuario autenticado ----------

export async function obtenerPerfil(): Promise<Perfil> {
  const { data } = await api.get(API_ME);
  return data;
}

export async function actualizarPerfil(datos: {
  nombre: string;
  email: string;
  telefono?: string | null;
}): Promise<Perfil> {
  const { data } = await api.put(API_ME, datos);
  return data;
}

export async function cambiarPassword(datos: {
  password_actual: string;
  password_nueva: string;
}): Promise<{ ok: boolean }> {
  const { data } = await api.put(`${API_ME}/password`, datos);
  return data;
}

// Elimina (da de baja) la cuenta del usuario autenticado.
export async function eliminarCuenta(): Promise<{ ok: boolean }> {
  const { data } = await api.delete(API_ME);
  return data;
}

// ---------- Foto de perfil ----------

// `archivo` es el asset que devuelve expo-image-picker. En web trae un
// File real; en iOS/Android hay que armar el objeto { uri, name, type }.
export async function subirAvatar(archivo: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: unknown;
}): Promise<Perfil> {
  const form = new FormData();

  if (archivo.file) {
    // Web: ya es un File listo para enviar.
    form.append('imagen', archivo.file as Blob);
  } else {
    form.append('imagen', {
      uri: archivo.uri,
      name: archivo.fileName ?? `avatar-${Date.now()}.jpg`,
      type: archivo.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }

  const { data } = await api.post(`${API_ME}/avatar`, form, {
    // En nativo hay que fijar el Content-Type; en web lo pone el navegador
    // (con el boundary correcto), así que no lo tocamos.
    headers:
      Platform.OS === 'web' ? undefined : { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function eliminarAvatar(): Promise<Perfil> {
  const { data } = await api.delete(API_ME_AVATAR);
  return data;
}
