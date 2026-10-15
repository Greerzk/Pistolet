// =====================================================================
//  PISTOLET · Layout raiz (Stack)
//
//  Antes aqui vivia un <Tabs> que competia con el grupo (tabs)/, lo que
//  provocaba DOS barras y que el login cargara dentro de un tab.
//  Ahora la raiz es un Stack y cada pantalla decide su chrome:
//    · (tabs)/  → barra inferior (catalogo)
//    · login, carrito, perfil, registro, estado-pedido → pantalla completa
// =====================================================================
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import { ThemeProvider, useTheme } from '@/lib/theme';

// Mantenemos el splash visible hasta que las fuentes de marca carguen.
SplashScreen.preventAutoHideAsync().catch(() => {});

function Navegacion() {
  const { theme, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fuentesListas, fuentesError] = useFonts({
    PlayfairDisplay: require('../assets/fonts/PlayfairDisplay-VariableFont_wght.ttf'),
    SpaceGrotesk: require('../assets/fonts/SpaceGrotesk-VariableFont_wght.ttf'),
  });

  useEffect(() => {
    // Ocultamos el splash cuando las fuentes están listas (o si fallan).
    if (fuentesListas || fuentesError) SplashScreen.hideAsync().catch(() => {});
  }, [fuentesListas, fuentesError]);

  if (!fuentesListas && !fuentesError) return null;

  return (
    <ThemeProvider>
      <Navegacion />
    </ThemeProvider>
  );
}
