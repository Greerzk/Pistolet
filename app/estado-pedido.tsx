import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ModalAviso, { TipoAviso } from '@/components/modal-aviso';
import { API_URL } from '@/constants/api';
import { fonts, radii, spacing, type Theme } from '@/constants/design.generated';
import { api } from '@/lib/auth';
import { useTheme, type ThemeShadows } from '@/lib/theme';

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente de confirmar',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo para recoger',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
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
  const { theme, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(theme, shadows), [theme, shadows]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const pedidoId = Number(id);

  const colorEstado = (estado: string): string => {
    switch (estado) {
      case 'pendiente':
        return theme.textMuted;
      case 'confirmado':
        return theme.copper;
      case 'en_preparacion':
        return theme.accent;
      case 'listo':
      case 'entregado':
        return theme.success;
      case 'cancelado':
        return theme.danger;
      default:
        return theme.accent;
    }
  };

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [aviso, setAviso] = useState<{ visible: boolean; titulo: string; mensaje?: string; tipo?: TipoAviso }>({
    visible: false,
    titulo: '',
  });
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  const mostrarAviso = (titulo: string, mensaje?: string, tipo: TipoAviso = 'info') => {
    setAviso({ visible: true, titulo, mensaje, tipo });
  };

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPedido();
  }, [cargarPedido]);

  // Polling: mientras el pedido no llegue a un estado final, refresca
  // cada 5 segundos para reflejar el avance del estado en mostrador.
  useEffect(() => {
    if (pedido && ESTADOS_FINALES.includes(pedido.estado)) return;
    const timer = setInterval(cargarPedido, 5000);
    return () => clearInterval(timer);
  }, [pedido, cargarPedido]);

  const solicitarCancelar = () => {
    setConfirmarCancelar(true);
  };

  const cancelarPedido = async () => {
    setConfirmarCancelar(false);
    setCancelando(true);
    try {
      await api.post(`${API_URL}/api/pedidos/${pedidoId}/cancelar`);
      await cargarPedido();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'No se pudo cancelar el pedido.';
      mostrarAviso('Error', msg, 'error');
    } finally {
      setCancelando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!pedido) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color={theme.border} />
        <Text style={styles.emptyTitle}>No encontramos este pedido</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/catalogo')}>
          <Text style={styles.primaryButtonText}>Volver al catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const estadoColor = colorEstado(pedido.estado);
  const sePuedeCancelar = SE_PUEDE_CANCELAR.includes(pedido.estado);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.folio}>{pedido.folio}</Text>
        <Text style={styles.date}>
          {new Date(pedido.creado_en).toLocaleString('es-MX')}
        </Text>

        <View style={[styles.statusBadge, { backgroundColor: estadoColor + '22', borderColor: estadoColor + '55' }]}>
          <View style={[styles.statusDot, { backgroundColor: estadoColor }]} />
          <Text style={[styles.statusText, { color: estadoColor }]}>
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
            onPress={solicitarCancelar}>
            {cancelando ? (
              <ActivityIndicator color={theme.danger} />
            ) : (
              <Text style={styles.secondaryButtonText}>Cancelar pedido</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/catalogo')}>
          <Text style={styles.primaryButtonText}>Volver al catálogo</Text>
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
        visible={confirmarCancelar}
        tipo="aviso"
        titulo="Cancelar pedido"
        mensaje="¿Seguro que deseas cancelar este pedido?"
        textoBoton="Sí, cancelar"
        onCerrar={cancelarPedido}
        textoCancelar="No"
        onCancelar={() => setConfirmarCancelar(false)}
      />
    </View>
  );
}

function makeStyles(t: Theme, sh: ThemeShadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    loadingWrap: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
    content: { padding: spacing[5], paddingBottom: spacing[8] },
    folio: { fontSize: 24, fontFamily: fonts.display, fontWeight: '700', color: t.heading },
    date: { fontSize: 13, color: t.textMuted, marginTop: spacing[1] },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderRadius: radii.pill,
      borderWidth: 1,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      marginTop: spacing[4],
    },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing[2] },
    statusText: { fontSize: 14, fontWeight: '700' },
    sectionTitle: {
      fontSize: 17,
      fontFamily: fonts.display,
      fontWeight: '700',
      color: t.heading,
      marginTop: spacing[6],
      marginBottom: spacing[2],
    },
    lineaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    lineaNombre: { color: t.text, fontSize: 14, flex: 1, paddingRight: spacing[3] },
    lineaTotal: { color: t.text, fontWeight: '600' },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing[5],
    },
    totalLabel: { fontSize: 16, color: t.text },
    totalValue: { fontSize: 20, fontWeight: '700', color: t.accent },
    notas: { fontSize: 13, color: t.textMuted, marginTop: spacing[3], fontStyle: 'italic' },
    footer: { padding: spacing[4], gap: spacing[3] },
    primaryButton: {
      backgroundColor: t.accent,
      borderRadius: radii.md,
      paddingVertical: spacing[4],
      alignItems: 'center',
      ...sh.sm,
    },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: t.onAccent, fontWeight: '700', fontSize: 16 },
    secondaryButton: {
      backgroundColor: t.surface,
      borderRadius: radii.md,
      paddingVertical: spacing[4],
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.danger,
    },
    secondaryButtonText: { color: t.danger, fontWeight: '700', fontSize: 16 },
    emptyContainer: {
      flex: 1,
      backgroundColor: t.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[8],
    },
    emptyTitle: { fontSize: 18, fontFamily: fonts.display, fontWeight: '700', color: t.heading, marginTop: spacing[4], marginBottom: spacing[6] },
  });
}
