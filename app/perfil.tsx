// =====================================================================
//  PISTOLET · Perfil del usuario (app móvil)
//
//  Muestra los datos de la cuenta (nombre, correo, teléfono, rol) y
//  los pedidos del cliente. Los datos frescos vienen de GET /api/me;
//  si falla, se usan los de la sesión guardada.
// =====================================================================
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_PEDIDOS } from '@/constants/api';
import { api, cargarSesion, cerrarSesion, obtenerPerfil, Perfil, Sesion } from '@/lib/auth';

const ETIQUETA_ROL: Record<string, string> = {
  cliente: 'Cliente',
  empleado: 'Empleado',
  admin: 'Administrador',
};

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const COLOR_ESTADO: Record<string, string> = {
  pendiente: '#8D6E63',
  confirmado: '#5D4037',
  en_preparacion: '#C8963E',
  listo: '#2E7D32',
  entregado: '#2E7D32',
  cancelado: '#B71C1C',
};

type PedidoResumen = {
  id: number;
  folio: string;
  estado: string;
  total: number;
  creado_en: string;
};

function inicialesDe(nombre: string): string {
  const letras = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
  return letras || 'MI';
}

function formatearFecha(fecha: string): string {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PerfilScreen() {
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);

  const cargar = useCallback(async () => {
    const s = await cargarSesion();
    setSesion(s);

    if (!s) {
      setCargando(false);
      return;
    }

    try {
      setPerfil(await obtenerPerfil());
    } catch {
      // Sin perfil fresco: seguimos con los datos de la sesión guardada.
    }

    try {
      const { data } = await api.get(API_PEDIDOS);
      setPedidos(Array.isArray(data) ? data : []);
    } catch {
      // Los pedidos no son críticos para ver el perfil.
    }

    setCargando(false);
  }, []);

  // Recargamos cada vez que la pantalla recibe el foco.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }, [cargar]);

  const cerrar = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await cerrarSesion();
          setSesion(null);
          setPerfil(null);
          setPedidos([]);
          router.replace('/');
        },
      },
    ]);
  };

  if (cargando) {
    return <ActivityIndicator size="large" color="#5D4037" style={{ flex: 1, backgroundColor: '#FFFBF5' }} />;
  }

  // Sin sesión: invitamos a iniciar sesión o crear una cuenta.
  if (!sesion) {
    return (
      <View style={styles.centrado}>
        <Ionicons name="person-circle-outline" size={80} color="#D7CCC8" />
        <Text style={styles.vacioTitulo}>Aún no inicias sesión</Text>
        <Text style={styles.vacioTexto}>
          Inicia sesión para ver tu perfil y tus pedidos.
        </Text>
        <TouchableOpacity style={styles.botonPrimario} onPress={() => router.replace('/')}>
          <Text style={styles.botonPrimarioTexto}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nombre = perfil?.nombre ?? sesion.user.nombre;
  const rol = perfil?.rol ?? sesion.user.rol;
  const correo = perfil?.email ?? '—';
  const telefono = perfil?.telefono?.trim() ? perfil.telefono : 'No registrado';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={['#5D4037']} />}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#5D4037" />
        <Text style={styles.backText}>Regresar</Text>
      </TouchableOpacity>

      {/* Encabezado: avatar + nombre + rol */}
      <View style={styles.encabezado}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{inicialesDe(nombre)}</Text>
        </View>
        <Text style={styles.nombre}>{nombre}</Text>
        <View style={styles.chipRol}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#5D4037" />
          <Text style={styles.chipRolTexto}>{ETIQUETA_ROL[rol] ?? rol}</Text>
        </View>
      </View>

      {/* Datos de la cuenta */}
      <View style={styles.tarjeta}>
        <Fila icono="mail-outline" etiqueta="Correo" valor={correo} />
        <Fila icono="call-outline" etiqueta="Teléfono" valor={telefono} />
        <Fila icono="calendar-outline" etiqueta="Miembro desde" valor={perfil ? formatearFecha(perfil.creado_en) : '—'} sinLinea />
      </View>

      {/* Pedidos del cliente */}
      <Text style={styles.seccion}>Mis pedidos</Text>
      {pedidos.length === 0 ? (
        <View style={styles.sinPedidos}>
          <Ionicons name="receipt-outline" size={32} color="#D7CCC8" />
          <Text style={styles.sinPedidosTexto}>Todavía no tienes pedidos.</Text>
        </View>
      ) : (
        pedidos.map((pedido) => (
          <TouchableOpacity
            key={pedido.id}
            style={styles.pedido}
            onPress={() => router.push(`/estado-pedido?id=${pedido.id}`)}>
            <View style={styles.pedidoInfo}>
              <Text style={styles.pedidoFolio}>{pedido.folio}</Text>
              <Text style={styles.pedidoFecha}>{formatearFecha(pedido.creado_en)}</Text>
            </View>
            <View style={styles.pedidoDerecha}>
              <Text style={[styles.pedidoEstado, { color: COLOR_ESTADO[pedido.estado] ?? '#5D4037' }]}>
                {ETIQUETA_ESTADO[pedido.estado] ?? pedido.estado}
              </Text>
              <Text style={styles.pedidoTotal}>${Number(pedido.total ?? 0).toFixed(2)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A1887F" />
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity style={styles.botonSalir} onPress={cerrar}>
        <Ionicons name="log-out-outline" size={20} color="#B71C1C" />
        <Text style={styles.botonSalirTexto}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Fila({
  icono,
  etiqueta,
  valor,
  sinLinea,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  etiqueta: string;
  valor: string;
  sinLinea?: boolean;
}) {
  return (
    <View style={[styles.fila, sinLinea && styles.filaSinLinea]}>
      <Ionicons name={icono} size={20} color="#8D6E63" style={styles.filaIcono} />
      <View style={styles.filaTextos}>
        <Text style={styles.filaEtiqueta}>{etiqueta}</Text>
        <Text style={styles.filaValor}>{valor}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5' },
  scroll: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
  },
  centrado: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  vacioTitulo: { fontSize: 18, fontWeight: 'bold', color: '#3E2723', marginTop: 15 },
  vacioTexto: {
    fontSize: 14,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backText: { color: '#5D4037', fontWeight: '600', marginLeft: 6, fontSize: 15 },
  encabezado: { alignItems: 'center', marginBottom: 25 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#D7CCC8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5D4037',
    marginBottom: 12,
  },
  avatarTexto: { fontSize: 34, fontWeight: 'bold', color: '#5D4037' },
  nombre: { fontSize: 22, fontWeight: 'bold', color: '#3E2723', textAlign: 'center' },
  chipRol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5EDE3',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
  },
  chipRolTexto: { color: '#5D4037', fontWeight: '600', fontSize: 13 },
  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DA',
  },
  filaSinLinea: { borderBottomWidth: 0 },
  filaIcono: { marginRight: 14 },
  filaTextos: { flex: 1 },
  filaEtiqueta: { fontSize: 12, color: '#A1887F' },
  filaValor: { fontSize: 16, color: '#3E2723', fontWeight: '600', marginTop: 2 },
  seccion: { fontSize: 17, fontWeight: 'bold', color: '#3E2723', marginBottom: 12 },
  sinPedidos: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  sinPedidosTexto: { color: '#8D6E63', marginTop: 8 },
  pedido: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  pedidoInfo: { flex: 1 },
  pedidoFolio: { fontSize: 15, fontWeight: 'bold', color: '#3E2723' },
  pedidoFecha: { fontSize: 12, color: '#A1887F', marginTop: 2 },
  pedidoDerecha: { alignItems: 'flex-end', marginRight: 8 },
  pedidoEstado: { fontSize: 12, fontWeight: '600' },
  pedidoTotal: { fontSize: 15, fontWeight: 'bold', color: '#5D4037', marginTop: 2 },
  botonPrimario: {
    marginTop: 20,
    backgroundColor: '#5D4037',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  botonPrimarioTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonSalir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 30,
    borderWidth: 1.5,
    borderColor: '#B71C1C',
    borderRadius: 12,
    paddingVertical: 14,
  },
  botonSalirTexto: { color: '#B71C1C', fontWeight: 'bold', fontSize: 15 },
});
