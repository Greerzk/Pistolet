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
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ModalAviso, { TipoAviso } from '@/components/modal-aviso';
import { API_PEDIDOS } from '@/constants/api';
import {
  actualizarPerfil,
  api,
  cargarSesion,
  cambiarPassword,
  cerrarSesion,
  eliminarCuenta,
  obtenerPerfil,
  Perfil,
  Sesion,
} from '@/lib/auth';

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

  // Edición de perfil
  const [editando, setEditando] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  // Cambio de contraseña
  const [cambiandoPwd, setCambiandoPwd] = useState(false);
  const [pwdActual, setPwdActual] = useState('');
  const [pwdNueva, setPwdNueva] = useState('');
  const [pwdConfirma, setPwdConfirma] = useState('');
  const [guardandoPwd, setGuardandoPwd] = useState(false);

  // Modal
  const [aviso, setAviso] = useState<{ visible: boolean; titulo: string; mensaje?: string; tipo?: TipoAviso }>({
    visible: false,
    titulo: '',
  });
  const [confirmSalir, setConfirmSalir] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [eliminandoCuenta, setEliminandoCuenta] = useState(false);
  const [eliminado, setEliminado] = useState(false);

  const mostrarAviso = (titulo: string, mensaje?: string, tipo: TipoAviso = 'info') => {
    setAviso({ visible: true, titulo, mensaje, tipo });
  };

  const iniciarEdicion = () => {
    if (!perfil) return;
    setFormNombre(perfil.nombre);
    setFormEmail(perfil.email);
    setFormTelefono(perfil.telefono ?? '');
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setGuardandoPerfil(false);
  };

  const guardarPerfil = async () => {
    if (!perfil) return;
    if (!formNombre.trim() || !formEmail.trim()) {
      mostrarAviso('Datos incompletos', 'Nombre y correo son obligatorios.', 'aviso');
      return;
    }
    setGuardandoPerfil(true);
    try {
      const actualizado = await actualizarPerfil({
        nombre: formNombre.trim(),
        email: formEmail.trim().toLowerCase(),
        telefono: formTelefono.trim() || null,
      });
      setPerfil(actualizado);
      setEditando(false);
      mostrarAviso('Perfil actualizado', 'Tu información se guardó correctamente.', 'exito');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'No se pudo actualizar el perfil.';
      mostrarAviso('Error', msg, 'error');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const abrirCambioPwd = () => {
    setPwdActual('');
    setPwdNueva('');
    setPwdConfirma('');
    setCambiandoPwd(true);
  };

  const cancelarCambioPwd = () => {
    setCambiandoPwd(false);
    setGuardandoPwd(false);
  };

  const guardarPwd = async () => {
    if (!pwdActual || !pwdNueva || !pwdConfirma) {
      mostrarAviso('Datos incompletos', 'Completa todos los campos.', 'aviso');
      return;
    }
    if (pwdNueva.length < 6) {
      mostrarAviso('Contraseña inválida', 'La nueva contraseña debe tener al menos 6 caracteres.', 'aviso');
      return;
    }
    if (pwdNueva !== pwdConfirma) {
      mostrarAviso('No coinciden', 'La nueva contraseña y la confirmación no coinciden.', 'aviso');
      return;
    }
    setGuardandoPwd(true);
    try {
      await cambiarPassword({ password_actual: pwdActual, password_nueva: pwdNueva });
      setCambiandoPwd(false);
      mostrarAviso('Contraseña actualizada', 'Tu contraseña se cambió correctamente.', 'exito');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'No se pudo cambiar la contraseña.';
      mostrarAviso('Error', msg, 'error');
    } finally {
      setGuardandoPwd(false);
    }
  };

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
    setConfirmSalir(true);
  };

  const confirmarSalir = async () => {
    await cerrarSesion();
    setConfirmSalir(false);
    setSesion(null);
    setPerfil(null);
    setPedidos([]);
    router.replace('/');
  };

  // Elimina la cuenta: confirmación previa y, al terminar, cerramos sesión.
  const confirmarEliminarCuenta = async () => {
    if (eliminandoCuenta) return;
    setEliminandoCuenta(true);
    try {
      await eliminarCuenta();
      setConfirmEliminar(false);
      setEliminandoCuenta(false);
      setEliminado(true);
    } catch (err: any) {
      setConfirmEliminar(false);
      setEliminandoCuenta(false);
      const msg = err?.response?.data?.error ?? 'No se pudo eliminar la cuenta.';
      mostrarAviso('Error', msg, 'error');
    }
  };

  // Tras leer el aviso de éxito, limpiamos la sesión local y salimos.
  const finalizarEliminacion = async () => {
    await cerrarSesion();
    setEliminado(false);
    setSesion(null);
    setPerfil(null);
    setPedidos([]);
    router.replace('/');
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
        {editando ? (
          <>
            <View style={styles.filaEditable}>
              <Ionicons name="person-outline" size={20} color="#8D6E63" style={styles.filaIcono} />
              <View style={styles.filaTextos}>
                <Text style={styles.filaEtiqueta}>Nombre completo</Text>
                <TextInput
                  value={formNombre}
                  onChangeText={setFormNombre}
                  placeholder="Tu nombre"
                  placeholderTextColor="#A1887F"
                  style={styles.input}
                />
              </View>
            </View>
            <View style={styles.filaEditable}>
              <Ionicons name="mail-outline" size={20} color="#8D6E63" style={styles.filaIcono} />
              <View style={styles.filaTextos}>
                <Text style={styles.filaEtiqueta}>Correo electrónico</Text>
                <TextInput
                  value={formEmail}
                  onChangeText={setFormEmail}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#A1887F"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>
            </View>
            <View style={[styles.filaEditable, styles.filaSinLinea]}>
              <Ionicons name="call-outline" size={20} color="#8D6E63" style={styles.filaIcono} />
              <View style={styles.filaTextos}>
                <Text style={styles.filaEtiqueta}>Teléfono</Text>
                <TextInput
                  value={formTelefono}
                  onChangeText={setFormTelefono}
                  placeholder="(opcional)"
                  placeholderTextColor="#A1887F"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.botonesEditar}>
              <TouchableOpacity
                style={[styles.botonSec, guardandoPerfil && styles.botonDeshabilitado]}
                onPress={cancelarEdicion}
                disabled={guardandoPerfil}>
                <Text style={styles.botonSecTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonPri, guardandoPerfil && styles.botonDeshabilitado]}
                onPress={guardarPerfil}
                disabled={guardandoPerfil}>
                {guardandoPerfil ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.botonPriTexto}>Guardar cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Fila icono="mail-outline" etiqueta="Correo" valor={correo} />
            <Fila icono="call-outline" etiqueta="Teléfono" valor={telefono} />
            <Fila icono="calendar-outline" etiqueta="Miembro desde" valor={perfil ? formatearFecha(perfil.creado_en) : '—'} sinLinea />
            <TouchableOpacity style={styles.botonEditar} onPress={iniciarEdicion}>
              <Ionicons name="create-outline" size={20} color="#5D4037" />
              <Text style={styles.botonEditarTexto}>Editar perfil</Text>
            </TouchableOpacity>
          </>
        )}
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

      {!editando && !cambiandoPwd && (
        <>
          <TouchableOpacity style={styles.botonCambiarPwd} onPress={abrirCambioPwd}>
            <Ionicons name="key-outline" size={20} color="#5D4037" />
            <Text style={styles.botonCambiarPwdTexto}>Cambiar contraseña</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botonSalir} onPress={cerrar}>
            <Ionicons name="log-out-outline" size={20} color="#B71C1C" />
            <Text style={styles.botonSalirTexto}>Cerrar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botonEliminar} onPress={() => setConfirmEliminar(true)}>
            <Ionicons name="trash-outline" size={20} color="#B71C1C" />
            <Text style={styles.botonEliminarTexto}>Eliminar cuenta</Text>
          </TouchableOpacity>
        </>
      )}

      {cambiandoPwd && (
        <View style={styles.tarjeta}>
          <Text style={styles.seccion}>Cambiar contraseña</Text>
          <View style={styles.filaEditable}>
            <Ionicons name="lock-closed-outline" size={20} color="#8D6E63" style={styles.filaIcono} />
            <View style={styles.filaTextos}>
              <Text style={styles.filaEtiqueta}>Contraseña actual</Text>
              <TextInput
                value={pwdActual}
                onChangeText={setPwdActual}
                placeholder="Ingresa tu contraseña actual"
                placeholderTextColor="#A1887F"
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>
          <View style={styles.filaEditable}>
            <Ionicons name="key-outline" size={20} color="#8D6E63" style={styles.filaIcono} />
            <View style={styles.filaTextos}>
              <Text style={styles.filaEtiqueta}>Nueva contraseña</Text>
              <TextInput
                value={pwdNueva}
                onChangeText={setPwdNueva}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#A1887F"
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>
          <View style={[styles.filaEditable, styles.filaSinLinea]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#8D6E63" style={styles.filaIcono} />
            <View style={styles.filaTextos}>
              <Text style={styles.filaEtiqueta}>Confirmar nueva contraseña</Text>
              <TextInput
                value={pwdConfirma}
                onChangeText={setPwdConfirma}
                placeholder="Repite la nueva contraseña"
                placeholderTextColor="#A1887F"
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.botonesEditar}>
            <TouchableOpacity
              style={[styles.botonSec, guardandoPwd && styles.botonDeshabilitado]}
              onPress={cancelarCambioPwd}
              disabled={guardandoPwd}>
              <Text style={styles.botonSecTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botonPri, guardandoPwd && styles.botonDeshabilitado]}
              onPress={guardarPwd}
              disabled={guardandoPwd}>
              {guardandoPwd ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botonPriTexto}>Cambiar contraseña</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ModalAviso
        visible={aviso.visible}
        titulo={aviso.titulo}
        mensaje={aviso.mensaje}
        tipo={aviso.tipo}
        onCerrar={() => setAviso((prev) => ({ ...prev, visible: false }))}
      />
      <ModalAviso
        visible={confirmSalir}
        tipo="aviso"
        titulo="Cerrar sesión"
        mensaje="¿Seguro que quieres salir de tu cuenta?"
        textoBoton="Salir"
        onCerrar={confirmarSalir}
        textoCancelar="Cancelar"
        onCancelar={() => setConfirmSalir(false)}
      />
      <ModalAviso
        visible={confirmEliminar}
        tipo="error"
        titulo="Eliminar cuenta"
        mensaje="Esta acción es permanente: se eliminará tu cuenta y ya no podrás iniciar sesión con ella. ¿Deseas continuar?"
        textoBoton={eliminandoCuenta ? 'Eliminando…' : 'Sí, eliminar'}
        onCerrar={confirmarEliminarCuenta}
        textoCancelar="Cancelar"
        onCancelar={() => setConfirmEliminar(false)}
      />
      <ModalAviso
        visible={eliminado}
        tipo="exito"
        titulo="Cuenta eliminada"
        mensaje="Tu cuenta se eliminó correctamente. ¡Gracias por tu preferencia!"
        textoBoton="Entendido"
        onCerrar={finalizarEliminacion}
      />
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
  botonEditar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#5D4037',
    borderRadius: 12,
    paddingVertical: 12,
  },
  botonEditarTexto: { color: '#5D4037', fontWeight: 'bold', fontSize: 15 },
  filaEditable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DA',
  },
  input: {
    marginTop: 6,
    backgroundColor: '#F5EDE3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#3E2723',
    fontSize: 15,
  },
  botonesEditar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  botonPri: {
    flex: 1,
    backgroundColor: '#5D4037',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botonPriTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  botonSec: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#5D4037',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botonSecTexto: { color: '#5D4037', fontWeight: 'bold', fontSize: 15 },
  botonDeshabilitado: { opacity: 0.6 },
  botonCambiarPwd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#5D4037',
    borderRadius: 12,
    paddingVertical: 14,
  },
  botonCambiarPwdTexto: { color: '#5D4037', fontWeight: 'bold', fontSize: 15 },
  botonSalir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#B71C1C',
    borderRadius: 12,
    paddingVertical: 14,
  },
  botonSalirTexto: { color: '#B71C1C', fontWeight: 'bold', fontSize: 15 },
  botonEliminar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    paddingVertical: 14,
  },
  botonEliminarTexto: { color: '#B71C1C', fontWeight: 'bold', fontSize: 15 },
});
