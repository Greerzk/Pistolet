import { Tabs } from 'expo-router';
import React from 'react';
// 1. IMPORTACIÓN CORREGIDA
import { FontAwesome5 } from '@expo/vector-icons';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome5>['name'];
  color: string;
}) {
  return <FontAwesome5 size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#5D4037', // Color café de Pistolet
        tabBarInactiveTintColor: '#A1887F',
        tabBarStyle: {
          backgroundColor: '#FFFBF5',
          borderTopWidth: 1,
          borderTopColor: '#D7CCC8',
          height: 60,
          paddingBottom: 8,
        },
        headerShown: false, // Usamos nuestro propio header del catálogo
      }}>
      
      <Tabs.Screen
        name="catalogo"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />

      {/* Esta es la pestaña de "Explore" que ya tenías, 
          puedes dejarla o renombrarla luego */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
        }}
      />

      {/* Pantallas accesibles por router.push pero sin pestaña en la barra */}
      <Tabs.Screen name="carrito" options={{ href: null }} />
      <Tabs.Screen name="estado-pedido" options={{ href: null }} />
      <Tabs.Screen name="modal" options={{ href: null }} />
    </Tabs>
  );
}