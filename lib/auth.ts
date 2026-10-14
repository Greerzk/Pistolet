// =====================================================================
//  PISTOLET · Sesión JWT + cliente axios autenticado
//
//  · 'guardarSesion' persiste tokens (SecureStore en iOS/Android,
//    memoria en web por simplicidad).
//  · El interceptor agrega el access token a cada request.
//  · Si el servidor responde 401, renueva el access token con el
//    refresh token una sola vez y reintenta la request original.
// =====================================================================
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_ME, API_REGISTER, API_TIMEOUT_MS, API_URL } from '@/constants/api';

const KEY_SESSION = 'pistolet.session';

export type Sesion = {
  accessToken: string;
  refreshToken: string;
  user: { id: number; nombre: string; rol: string };
};

// Datos que regresa GET /api/me (pantalla de perfil).
export type Perfil = {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  creado_en: string;
};

let cache: Sesion | null = null;
const webMemory = new Map<string, string>();

async function guardar(key: string, value: string) {
  if (Platform.OS === 'web') {
    webMemory.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function obtener(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return webMemory.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function borrar(key: string) {
  if (Platform.OS === 'web') {
    webMemory.delete(key);
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
}): Promise<{ id: number; nombre: string; email: string; rol: string }> {
  const { data } = await axios.post(API_REGISTER, datos);
  return data.user;
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
