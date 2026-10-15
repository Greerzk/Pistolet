// =====================================================================
//  PISTOLET · Barra inferior de la seccion principal
//
//  Unico tab visible: el catalogo. El resto de pantallas (carrito,
//  perfil, registro, estado-pedido) son pantallas del Stack raiz, NO
//  tabs, por eso ya no aparecen aqui.
// =====================================================================
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { fonts } from '@/constants/design.generated';
import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.inverseBg,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 11 },
      }}>
      <Tabs.Screen
        name="catalogo"
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
