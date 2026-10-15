// =====================================================================
//  PISTOLET · Modal de aviso reutilizable
//
//  Muestra mensajes de éxito, error, información o advertencia con el
//  estilo de la marca (tema claro/oscuro). Toda notificación al usuario
//  sale en un modal.
// =====================================================================
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { fonts, radii, spacing, type Theme } from '@/constants/design.generated';
import { alpha, useTheme, type ThemeShadows } from '@/lib/theme';

export type TipoAviso = 'exito' | 'error' | 'info' | 'aviso';

type Icono = React.ComponentProps<typeof Ionicons>['name'];

function estiloPorTipo(t: Theme): Record<TipoAviso, { icono: Icono; color: string }> {
  return {
    exito: { icono: 'checkmark-circle', color: t.success },
    error: { icono: 'close-circle', color: t.danger },
    info: { icono: 'information-circle', color: t.info },
    aviso: { icono: 'alert-circle', color: t.warning },
  };
}

type Props = {
  visible: boolean;
  tipo?: TipoAviso;
  titulo: string;
  mensaje?: string;
  textoBoton?: string;
  onCerrar: () => void;
  // Soporte para confirmación (dos botones)
  textoCancelar?: string;
  onCancelar?: () => void;
};

export default function ModalAviso({
  visible,
  tipo = 'info',
  titulo,
  mensaje,
  textoBoton = 'Entendido',
  onCerrar,
  textoCancelar,
  onCancelar,
}: Props) {
  const { theme, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(theme, shadows), [theme, shadows]);
  const estilo = estiloPorTipo(theme)[tipo];
  const esConfirmacion = Boolean(textoCancelar && onCancelar);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.backdrop}>
        <View style={styles.tarjeta}>
          <View style={[styles.iconoContenedor, { backgroundColor: alpha(estilo.color, 0.16) }]}>
            <Ionicons name={estilo.icono} size={46} color={estilo.color} />
          </View>
          <Text style={styles.titulo}>{titulo}</Text>
          {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}

          {esConfirmacion ? (
            <View style={styles.botoneraConfirmacion}>
              <TouchableOpacity
                style={styles.botonSecundario}
                onPress={onCancelar}
                activeOpacity={0.85}>
                <Text style={styles.botonSecundarioTexto}>{textoCancelar}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonPrimario} onPress={onCerrar} activeOpacity={0.85}>
                <Text style={styles.botonPrimarioTexto}>{textoBoton}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.boton} onPress={onCerrar} activeOpacity={0.85}>
              <Text style={styles.botonTexto}>{textoBoton}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(t: Theme, sh: ThemeShadows) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: alpha(t.inverseBg, 0.72),
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[8],
    },
    tarjeta: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radii.xl,
      padding: spacing[6],
      alignItems: 'center',
      ...sh.lg,
    },
    iconoContenedor: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing[4],
    },
    titulo: {
      fontSize: 19,
      fontFamily: fonts.display,
      fontWeight: '700',
      color: t.heading,
      textAlign: 'center',
    },
    mensaje: {
      fontSize: 15,
      color: t.textMuted,
      textAlign: 'center',
      marginTop: spacing[2],
      lineHeight: 21,
    },
    boton: {
      marginTop: spacing[6],
      alignSelf: 'stretch',
      backgroundColor: t.accent,
      borderRadius: radii.md,
      paddingVertical: spacing[4],
      alignItems: 'center',
    },
    botonTexto: { color: t.onAccent, fontWeight: '700', fontSize: 15 },
    botoneraConfirmacion: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[3],
      marginTop: spacing[6],
      alignSelf: 'stretch',
    },
    botonSecundario: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: t.border,
      borderRadius: radii.md,
      paddingVertical: spacing[4],
      alignItems: 'center',
      backgroundColor: t.surface,
    },
    botonSecundarioTexto: { color: t.text, fontWeight: '700', fontSize: 15 },
    botonPrimario: {
      flex: 1,
      backgroundColor: t.accent,
      borderRadius: radii.md,
      paddingVertical: spacing[4],
      alignItems: 'center',
    },
    botonPrimarioTexto: { color: t.onAccent, fontWeight: '700', fontSize: 15 },
  });
}
