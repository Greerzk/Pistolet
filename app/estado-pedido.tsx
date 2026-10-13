import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '@/constants/api';
import { api } from '@/lib/auth';

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente de confirmar',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo para recoger',
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

const ESTADOS_FINALES = ['entregado', 'cancelado'];
const SE_PUEDE_CANCELAR = ['pendiente', 'confirmado', 'en_preparacion'];

type Linea = {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

type Pedido = {
  id: number;
  folio: string;
  estado: string;
  total: number;
  notas: string | null;
  creado_en: string;
  cliente: string;
  lineas: Linea[];
};

export default function EstadoPedidoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pedidoId = Number(id);

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState(false);

  const cargarPedido = useCallback(async () => {
    try {
      const { data } = await api.get(`${API_URL}/api/pedidos/${pedidoId}`);
      setPedido(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setPedido(null);
      }
    } finally {
      setLoading(false);
    }
  }, [pedidoId]);

  useEffect(() => {
    cargarPedido();
  }, [cargarPedido]);

  // Polling: mientras el pedido no llegue a un estado final, refresca
  // cada 5 segundos para reflejar el avance del estado en mostrador.
  useEffect(() => {
    if (pedido && ESTADOS_FINALES.includes(pedido.estado)) return;
    const timer = setInterval(cargarPedido, 5000);
    return () => clearInterval(timer);
  }, [pedido, cargarPedido]);

  const cancelarPedido = async () => {
    setCancelando(true);
    try {
      await api.post(`${API_URL}/api/pedidos/${pedidoId}/cancelar`);
      await cargarPedido();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'No se pudo cancelar el pedido.');
    } finally {
      setCancelando(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#5D4037" style={{ flex: 1 }} />;
  }

  if (!pedido) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color="#D7CCC8" />
        <Text style={styles.emptyTitle}>No encontramos este pedido</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/catalogo')}>
          <Text style={styles.primaryButtonText}>Volver al catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const colorEstado = COLOR_ESTADO[pedido.estado] ?? '#5D4037';
  const sePuedeCancelar = SE_PUEDE_CANCELAR.includes(pedido.estado);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.folio}>{pedido.folio}</Text>
        <Text style={styles.date}>
          {new Date(pedido.creado_en).toLocaleString('es-MX')}
        </Text>

        <View style={[styles.statusBadge, { backgroundColor: colorEstado + '22' }]}>
          <View style={[styles.statusDot, { backgroundColor: colorEstado }]} />
          <Text style={[styles.statusText, { color: colorEstado }]}>
            {ETIQUETAS_ESTADO[pedido.estado] ?? pedido.estado}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Tu pedido</Text>
        {pedido.lineas.map((linea, indice) => (
          <View key={indice} style={styles.lineaRow}>
            <Text style={styles.lineaNombre}>
              {linea.cantidad} × {linea.nombre}
            </Text>
            <Text style={styles.lineaTotal}>${linea.subtotal.toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${pedido.total.toFixed(2)}</Text>
        </View>

        {pedido.notas ? (
          <Text style={styles.notas}>Nota: {pedido.notas}</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {sePuedeCancelar && (
          <TouchableOpacity
            style={[styles.secondaryButton, cancelando && styles.primaryButtonDisabled]}
            disabled={cancelando}
            onPress={cancelarPedido}>
            {cancelando ? (
              <ActivityIndicator color="#B71C1C" />
            ) : (
              <Text style={styles.secondaryButtonText}>Cancelar pedido</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/catalogo')}>
          <Text style={styles.primaryButtonText}>Volver al catálogo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  content: { padding: 20, paddingBottom: 30 },
  folio: { fontSize: 22, fontWeight: 'bold', color: '#3E2723' },
  date: { fontSize: 13, color: '#8D6E63', marginTop: 4 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 14,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: '700' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2723',
    marginTop: 25,
    marginBottom: 8,
  },
  lineaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE3D5',
  },
  lineaNombre: { color: '#5D4037', fontSize: 14, flex: 1, paddingRight: 10 },
  lineaTotal: { color: '#5D4037', fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  totalLabel: { fontSize: 16, color: '#5D4037' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#3E2723' },
  notas: { fontSize: 13, color: '#8D6E63', marginTop: 12, fontStyle: 'italic' },
  footer: { padding: 15, gap: 10 },
  primaryButton: {
    backgroundColor: '#5D4037',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B71C1C',
  },
  secondaryButtonText: { color: '#B71C1C', fontWeight: 'bold', fontSize: 16 },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#3E2723', marginTop: 15, marginBottom: 25 },
});