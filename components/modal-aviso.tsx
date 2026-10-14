// =====================================================================
//  PISTOLET · Modal de aviso reutilizable
//
//  Muestra mensajes de éxito, error, información o advertencia con el
//  estilo de la marca. Toda notificación al usuario sale en un modal
//  (nunca en consola ni en diálogos genéricos del sistema).
// =====================================================================
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type TipoAviso = 'exito' | 'error' | 'info' | 'aviso';

type Icono = React.ComponentProps<typeof Ionicons>['name'];

const ESTILOS_POR_TIPO: Record<TipoAviso, { icono: Icono; color: string; fondo: string }> = {
  exito: { icono: 'checkmark-circle', color: '#2E7D32', fondo: '#E8F5E9' },
  error: { icono: 'close-circle', color: '#B71C1C', fondo: '#FFEBEE' },
  info: { icono: 'information-circle', color: '#1565C0', fondo: '#E3F2FD' },
  aviso: { icono: 'alert-circle', color: '#C8963E', fondo: '#FFF8E1' },
};

type Props = {
  visible: boolean;
  tipo?: TipoAviso;
  titulo: string;
  mensaje?: string;
  textoBoton?: string;
  onCerrar: () => void;
};

export default function ModalAviso({
  visible,
  tipo = 'info',
  titulo,
  mensaje,
  textoBoton = 'Entendido',
  onCerrar,
}: Props) {
  const estilo = ESTILOS_POR_TIPO[tipo];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.backdrop}>
        <View style={styles.tarjeta}>
          <View style={[styles.iconoContenedor, { backgroundColor: estilo.fondo }]}>
            <Ionicons name={estilo.icono} size={46} color={estilo.color} />
          </View>
          <Text style={styles.titulo}>{titulo}</Text>
          {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
          <TouchableOpacity style={styles.boton} onPress={onCerrar} activeOpacity={0.85}>
            <Text style={styles.botonTexto}>{textoBoton}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(62, 39, 35, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFBF5',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  iconoContenedor: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titulo: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#3E2723',
    textAlign: 'center',
  },
  mensaje: {
    fontSize: 15,
    color: '#6D4C41',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  boton: {
    marginTop: 22,
    alignSelf: 'stretch',
    backgroundColor: '#5D4037',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
