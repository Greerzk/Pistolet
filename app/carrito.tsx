import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '@/constants/api';
import { api, cargarSesion } from '@/lib/auth';
import { carritoAItems, carritoStore, useCarrito } from '@/lib/carrito';

export default function CarritoScreen() {
  const router = useRouter();
  const carrito = useCarrito();
  const [confirmando, setConfirmando] = useState(false);

  const items = Object.values(carrito);
  const total = carritoStore.total();

  const confirmarPedido = async () => {
    const sesion = await cargarSesion();
    if (!sesion) {
      Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para hacer tu pedido.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar sesión', onPress: () => router.replace('/') },
      ]);
      return;
    }

    setConfirmando(true);
    try {
      const { data } = await api.post(`${API_URL}/api/pedidos`, {
        items: carritoAItems(carrito),
        notas: '',
      });
      carritoStore.limpiar();
      router.replace(`/estado-pedido?id=${data.pedido_id}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        'No se pudo confirmar el pedido. Intenta de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setConfirmando(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color="#D7CCC8" />
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptyText}>Agrega tus panes favoritos del catálogo.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/catalogo')}>
          <Text style={styles.primaryButtonText}>Ver catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.producto.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.name}>{item.producto.nombre}</Text>
              <Text style={styles.price}>${item.producto.precio.toFixed(2)} c/u</Text>
            </View>

            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => carritoStore.setCantidad(item.producto.id, item.cantidad - 1)}>
                <Ionicons name="remove" size={18} color="#5D4037" />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{item.cantidad}</Text>
              <TouchableOpacity
                style={[styles.stepperButton, item.cantidad >= item.producto.stock && styles.stepperDisabled]}
                disabled={item.cantidad >= item.producto.stock}
                onPress={() => carritoStore.setCantidad(item.producto.id, item.cantidad + 1)}>
                <Ionicons name="add" size={18} color="#5D4037" />
              </TouchableOpacity>
            </View>

            <Text style={styles.lineTotal}>
              ${(item.cantidad * item.producto.precio).toFixed(2)}
            </Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => carritoStore.quitar(item.producto.id)}>
              <Ionicons name="trash-outline" size={18} color="#A1887F" />
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, confirmando && styles.primaryButtonDisabled]}
          disabled={confirmando}
          onPress={confirmarPedido}>
          {confirmando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Confirmar pedido</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5', paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  listContent: { paddingHorizontal: 15, paddingBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: 'bold', color: '#3E2723' },
  price: { fontSize: 12, color: '#8D6E63', marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5EDE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: { opacity: 0.4 },
  stepperValue: { minWidth: 24, textAlign: 'center', color: '#5D4037', fontWeight: '600' },
  lineTotal: { minWidth: 64, textAlign: 'right', color: '#5D4037', fontWeight: '700' },
  removeButton: { marginLeft: 8, padding: 4 },
  footer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#D7CCC8',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: { fontSize: 16, color: '#5D4037' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#3E2723' },
  primaryButton: {
    backgroundColor: '#5D4037',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#3E2723', marginTop: 15 },
  emptyText: { fontSize: 14, color: '#8D6E63', textAlign: 'center', marginTop: 6, marginBottom: 25 },
});