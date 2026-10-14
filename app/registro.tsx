// =====================================================================
//  PISTOLET · Registro de cliente (app móvil)
//  Usa el MISMO backend que la web: POST /api/register (forzado a rol 'cliente')
//  Muestra validaciones y mensajes en modal con el estilo de la marca.
// =====================================================================
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ModalAviso, { TipoAviso } from '@/components/modal-aviso';
import { registrarCliente } from '@/lib/auth';

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistroScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirma, setConfirma] = useState('');
  const [cargando, setCargando] = useState(false);

  const [aviso, setAviso] = useState<{ visible: boolean; titulo: string; mensaje?: string; tipo?: TipoAviso }>({
    visible: false,
    titulo: '',
  });
  const [exito, setExito] = useState(false);

  const mostrarAviso = (titulo: string, mensaje?: string, tipo: TipoAviso = 'info') => {
    setAviso({ visible: true, titulo, mensaje, tipo });
  };

  const validar = () => {
    if (!nombre.trim()) {
      mostrarAviso('Campo obligatorio', 'Escribe tu nombre completo.', 'aviso');
      return false;
    }
    if (!email.trim()) {
      mostrarAviso('Campo obligatorio', 'Escribe tu correo electrónico.', 'aviso');
      return false;
    }
    if (!RE_CORREO.test(email.trim().toLowerCase())) {
      mostrarAviso('Correo inválido', 'Revisa el formato de tu correo.', 'aviso');
      return false;
    }
    if (telefono.trim() && telefono.trim().length > 20) {
      mostrarAviso('Teléfono inválido', 'El teléfono es demasiado largo.', 'aviso');
      return false;
    }
    if (!password) {
      mostrarAviso('Campo obligatorio', 'Escribe una contraseña.', 'aviso');
      return false;
    }
    if (password.length < 6) {
      mostrarAviso('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres.', 'aviso');
      return false;
    }
    if (password !== confirma) {
      mostrarAviso('No coinciden', 'La contraseña y la confirmación no coinciden.', 'aviso');
      return false;
    }
    return true;
  };

  const registrar = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      await registrarCliente({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || undefined,
        password,
      });
      setExito(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'No se pudo crear la cuenta. Intenta con otro correo.';
      mostrarAviso('No se pudo crear la cuenta', msg, 'error');
    } finally {
      setCargando(false);
    }
  };

  const irALogin = () => {
    setExito(false);
    router.replace(`/(tabs)?email=${encodeURIComponent(email.trim().toLowerCase())}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#5D4037" />
        <Text style={styles.backText}>Regresar</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Crear cuenta</Text>
      <Text style={styles.subtitulo}>Regístrate para hacer pedidos desde la app</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre completo *</Text>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          placeholder="Tu nombre y apellidos"
          placeholderTextColor="#A1887F"
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Correo electrónico *</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="correo@ejemplo.com"
          placeholderTextColor="#A1887F"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Teléfono (opcional)</Text>
        <TextInput
          value={telefono}
          onChangeText={setTelefono}
          placeholder="0000000000"
          placeholderTextColor="#A1887F"
          style={styles.input}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Contraseña *</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor="#A1887F"
          style={styles.input}
          secureTextEntry
        />

        <Text style={styles.label}>Confirmar contraseña *</Text>
        <TextInput
          value={confirma}
          onChangeText={setConfirma}
          placeholder="Repite tu contraseña"
          placeholderTextColor="#A1887F"
          style={styles.input}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.boton, cargando && styles.botonDeshabilitado]}
          onPress={registrar}
          disabled={cargando}>
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botonTexto}>Crear cuenta</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.linkTexto}>
            ¿Ya tienes cuenta? <Text style={styles.linkStrong}>Inicia sesión</Text>
          </Text>
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
        visible={exito}
        tipo="exito"
        titulo="¡Bienvenido a la familia Pistolet!"
        mensaje="Tu cuenta ha sido creada. Ya puedes iniciar sesión."
        textoBoton="Ir a iniciar sesión"
        onCerrar={irALogin}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5' },
  content: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
  },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backText: { color: '#5D4037', fontWeight: '600', marginLeft: 6, fontSize: 15 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#3E2723' },
  subtitulo: { fontSize: 15, color: '#8D6E63', marginTop: 4, marginBottom: 20 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 18, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  label: { fontSize: 14, fontWeight: '600', color: '#5D4037', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#F5EDE3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: '#3E2723', fontSize: 15 },
  boton: { marginTop: 22, backgroundColor: '#5D4037', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { marginTop: 16, alignItems: 'center' },
  linkTexto: { color: '#8D6E63', fontSize: 15 },
  linkStrong: { color: '#5D4037', fontWeight: 'bold' },
});
