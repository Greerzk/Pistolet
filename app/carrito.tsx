import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ModalAviso, { TipoAviso } from '@/components/modal-aviso';
import { API_URL } from '@/constants/api';
import { fonts, radii, spacing, type Theme } from '@/constants/design.generated';
import { api, cargarSesion } from '@/lib/auth';
import { carritoAItems, carritoStore, useCarrito } from '@/lib/carrito';
import { useTheme, type ThemeShadows } from '@/lib/theme';

export default function CarritoScreen() {
  const router = useRouter();
  const { theme, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(theme, shadows), [theme, shadows]);
  const carrito = useCarrito();
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<{ visible: boolean; titulo: string; mensaje?: string; tipo?: TipoAviso }>({
    visible: false,
    titulo: '',
  });
  const [pedirLogin, setPedirLogin] = useState(false);

  const mostrarAviso = (titulo: string, mensaje?: string, tipo: TipoAviso = 'info') => {
    setAviso({ visible: true, titulo, mensaje, tipo });
  };

  const items = Object.values(carrito);
  const total = carritoStore.total();

  const confirmarPedido = async () => {
    const sesion = await cargarSesion();
    if (!sesion) {
      setPedirLogin(true);
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
      mostrarAviso('Error', msg, 'error');
    } finally {
      setConfirmando(false);
    }
  };

  const irALogin = () => {
    setPedirLogin(false);
    router.replace('/');
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color={theme.border} />
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
                <Ionicons name="remove" size={18} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{item.cantidad}</Text>
              <TouchableOpacity
                style={[styles.stepperButton, item.cantidad >= item.producto.stock && styles.stepperDisabled]}
                disabled={item.cantidad >= item.producto.stock}
                onPress={() => carritoStore.setCantidad(item.producto.id, item.cantidad + 1)}>
                <Ionicons name="add" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.lineTotal}>
              ${(item.cantidad * item.producto.precio).toFixed(2)}
            </Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => carritoStore.quitar(item.producto.id)}>
              <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
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
            <ActivityIndicator color={theme.onAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>Confirmar pedido</Text>
          )}
        </TouchableOpacity>
      </View>

      <ModalAviso
        visible={aviso.visible}
        titulo={aviso.titulo}
        mensaje={aviso.mensaje}
        tipo={aviso.tipo}
        onCerrar={() => setAviso((prev) => ({ ...prev, visible: false }))}
      />
      <ModalAviso
        visible={pedirLogin}
        tipo="aviso"
        titulo="Inicia sesión"
        mensaje="Necesitas iniciar sesión para hacer tu pedido."
        textoBoton="Iniciar sesión"
        onCerrar={irALogin}
        textoCancelar="Cancelar"
        onCancelar={() => setPedirLogin(false)}
      />
    </View>
  );
}

function makeStyles(t: Theme, sh: ThemeShadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
    listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[5] },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radii.md,
      padding: spacing[3],
      marginBottom: spacing[3],
      ...sh.sm,
    },
    cardInfo: { flex: 1 },
    name: { fontSize: 15, fontWeight: '700', color: t.text },
    price: { fontSize: 12, color: t.textMuted, marginTop: 2 },
    stepper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing[3] },
    stepperButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperDisabled: { opacity: 0.4 },
    stepperValue: { minWidth: 24, textAlign: 'center', color: t.text, fontWeight: '600' },
    lineTotal: { minWidth: 64, textAlign: 'right', color: t.accent, fontWeight: '700' },
    removeButton: { marginLeft: spacing[2], padding: 4 },
    footer: {
      padding: spacing[4],
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing[3],
    },
    totalLabel: { fontSize: 16, color: t.text },
    totalValue: { fontSize: 20, fontFamily: fonts.display, fontWeight: '700', color: t.heading },
    primaryButton: {
      backgroundColor: t.accent,
      borderRadius: radii.md,
      paddingVertical: spacing[4],
      alignItems: 'center',
    },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: t.onAccent, fontWeight: '700', fontSize: 16 },
    emptyContainer: {
      flex: 1,
      backgroundColor: t.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[8],
    },
    emptyTitle: { fontSize: 18, fontFamily: fonts.display, fontWeight: '700', color: t.heading, marginTop: spacing[4] },
    emptyText: { fontSize: 14, color: t.textMuted, textAlign: 'center', marginTop: spacing[2], marginBottom: spacing[6] },
  });
}
