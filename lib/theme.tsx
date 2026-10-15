// =====================================================================
//  PISTOLET · Proveedor de tema (claro / oscuro)
//
//  Modo por defecto: OSCURO (definido en design/tokens.json).
//  El usuario puede alternar; la eleccion se persiste
//  (localStorage en web, SecureStore en iOS/Android).
// =====================================================================
import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import {
  defaultScheme,
  shadows as shadowMap,
  themes,
  type Scheme,
  type Theme,
} from '@/constants/design.generated';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ThemeMode = Scheme | 'system';

const KEY_MODO = 'pistolet.theme';

async function leerModoGuardado(): Promise<ThemeMode | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? localStorage.getItem(KEY_MODO)
        : await SecureStore.getItemAsync(KEY_MODO);
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : null;
  } catch {
    return null;
  }
}

async function guardarModo(modo: ThemeMode) {
  try {
    if (Platform.OS === 'web') localStorage.setItem(KEY_MODO, modo);
    else await SecureStore.setItemAsync(KEY_MODO, modo);
  } catch {
    // Si falla el guardado, el tema sigue funcionando en memoria.
  }
}

type ThemeContextValue = {
  theme: Theme;
  scheme: Scheme;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (modo: ThemeMode) => void;
  toggle: () => void;
  shadows: (typeof shadowMap)[Scheme];
};

export type ThemeShadows = ThemeContextValue['shadows'];

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sistema = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(defaultScheme);

  // Carga la preferencia guardada una sola vez.
  useEffect(() => {
    let activo = true;
    leerModoGuardado().then((m) => {
      if (activo && m) setModeState(m);
    });
    return () => {
      activo = false;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void guardarModo(m);
  }, []);

  const scheme: Scheme = mode === 'system' ? (sistema === 'light' ? 'light' : 'dark') : mode;

  // Pinta el fondo a nivel de sistema (útil en Android tras el status bar).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    SystemUI.setBackgroundColorAsync(themes[scheme].bg).catch(() => {});
  }, [scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[scheme],
      scheme,
      isDark: scheme === 'dark',
      mode,
      setMode,
      toggle: () => setMode(scheme === 'dark' ? 'light' : 'dark'),
      shadows: shadowMap[scheme],
    }),
    [scheme, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>.');
  return ctx;
}

// Hex con transparencia (fondos suaves de estado, overlays, etc.).
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
