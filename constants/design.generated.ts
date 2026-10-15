/* =====================================================================
 *  GENERADO desde design/tokens.json — NO EDITAR A MANO.
 *  Edita los tokens y corre: node design/build-tokens.mjs
 * ===================================================================== */
import type { ViewStyle } from 'react-native';

export type Scheme = 'light' | 'dark';

export const primitives = {
  "coffee": {
    "500": "#5D4037",
    "600": "#3E2E22",
    "700": "#2E2118",
    "800": "#241A13",
    "850": "#17110D",
    "900": "#120C09"
  },
  "cream": {
    "100": "#F5E9D7",
    "200": "#EADCC6"
  },
  "gold": {
    "400": "#E0B65E",
    "500": "#C8963E",
    "600": "#A87B2E"
  },
  "copper": {
    "500": "#B67345"
  },
  "white": "#FFFFFF"
} as const;

const dark = {
  bg: '#17110D',
  surface: '#241A13',
  surfaceSubtle: '#2E2118',
  border: '#3E2E22',
  text: '#F5E9D7',
  textMuted: '#B9A48C',
  heading: '#E0B65E',
  accent: '#C8963E',
  accentHover: '#E0B65E',
  onAccent: '#241A13',
  inverseBg: '#120C09',
  inverseText: '#F5E9D7',
  copper: '#B67345',
  focusRing: '#C8963E',
  danger: '#D9705F',
  success: '#7FA86A',
  warning: '#E0B65E',
  info: '#7FA9D6',
};

const light = {
  bg: '#F5EFE6',
  surface: '#FFFBF5',
  surfaceSubtle: '#EFE6DA',
  border: '#DCCDB8',
  text: '#3E2723',
  textMuted: '#7A6558',
  heading: '#A87B2E',
  accent: '#B67345',
  accentHover: '#1A120C',
  onAccent: '#FFFFFF',
  inverseBg: '#17110D',
  inverseText: '#F5E9D7',
  copper: '#B67345',
  focusRing: '#B67345',
  danger: '#B3261E',
  success: '#3F7D4E',
  warning: '#B7791F',
  info: '#3A6EA5',
};

// Los dos temas comparten exactamente las mismas claves.
export type Theme = typeof dark;

export const themes: { dark: Theme; light: Theme } = { dark, light };

export const typography = {
  "display": "PlayfairDisplay",
  "body": "SpaceGrotesk",
  "sizes": {
    "xs": 12,
    "sm": 14,
    "md": 16,
    "lg": 18,
    "xl": 22,
    "2xl": 28,
    "3xl": 34,
    "display": 44
  },
  "weights": {
    "regular": 400,
    "medium": 500,
    "semibold": 600,
    "bold": 700
  }
} as const;

export const spacing = {
  "0": 0,
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "8": 32,
  "10": 40,
  "12": 48,
  "16": 64
} as const;

export const radii = {
  "sm": 8,
  "md": 12,
  "lg": 16,
  "xl": 24,
  "pill": 999
} as const;

export const shadows: Record<Scheme, Record<'sm' | 'md' | 'lg', ViewStyle>> = {
  light: {
    sm: { shadowColor: '#1A1817', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    md: { shadowColor: '#1A1817', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
    lg: { shadowColor: '#1A1817', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 32, elevation: 9 },
  },
  dark: {
    sm: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.45, shadowRadius: 3, elevation: 2 },
    md: { shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 5 },
    lg: { shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.55, shadowRadius: 32, elevation: 9 },
  },
};

export const fonts = {
  display: 'PlayfairDisplay',
  body: 'SpaceGrotesk',
} as const;

export const defaultScheme: Scheme = 'dark';
