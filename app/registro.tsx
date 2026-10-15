// =====================================================================
//  PISTOLET · Registro de cliente (app móvil)
//  Usa el MISMO backend que la web: POST /api/register (forzado a rol 'cliente')
//  Muestra validaciones y mensajes en modal con el estilo de la marca.
// =====================================================================
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
import { fonts, radii, spacing, type Theme } from '@/constants/design.generated';
import { registrarCliente } from '@/lib/auth';
import { useTheme, type ThemeShadows } from '@/lib/theme';

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistroScreen() {
  const router = useRouter();
  const { theme, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(theme, shadows), [theme, shadows]);

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
  // true cuando el correo pertenecía a un cliente dado de baja y se reactivó.
  const [reactivado, setReactivado] = useState(false);

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
      const respuesta = await registrarCliente({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || undefined,
        password,
      });
      setReactivado(Boolean(respuesta?.reactivado));
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
    router.replace(`/?email=${encodeURIComponent(email.trim().toLowerCase())}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={theme.text} />
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
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Correo electrónico *</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="correo@ejemplo.com"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Teléfono (opcional)</Text>
        <TextInput
          value={telefono}
          onChangeText={setTelefono}
          placeholder="0000000000"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Contraseña *</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          secureTextEntry
        />

        <Text style={styles.label}>Confirmar contraseña *</Text>
        <TextInput
          value={confirma}
          onChangeText={setConfirma}
          placeholder="Repite tu contraseña"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.boton, cargando && styles.botonDeshabilitado]}
          onPress={registrar}
          disabled={cargando}>
          {cargando ? (
            <ActivityIndicator color={theme.onAccent} />
          ) : (
            <Text style={styles.botonTexto}>Crear cuenta</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => router.replace('/')}>
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
        titulo={reactivado ? '¡Te extrañamos!' : '¡Bienvenido a la familia Pistolet!'}
        mensaje={
          reactivado
            ? 'Tu cuenta fue reactivada. Ya puedes iniciar sesión.'
            : 'Tu cuenta ha sido creada. Ya puedes iniciar sesión.'
        }
        textoBoton="Ir a iniciar sesión"
        onCerrar={irALogin}
      />
    </ScrollView>
  );
}

function makeStyles(t: Theme, sh: ThemeShadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    content: {
      padding: spacing[5],
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: spacing[16],
    },
    back: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[4] },
    backText: { color: t.text, fontWeight: '600', marginLeft: spacing[2], fontSize: 15 },
    titulo: { fontSize: 30, fontFamily: fonts.display, fontWeight: '700', color: t.heading },
    subtitulo: { fontSize: 15, color: t.textMuted, marginTop: spacing[1], marginBottom: spacing[5] },
    form: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radii.lg,
      padding: spacing[5],
      ...sh.md,
    },
    label: { fontSize: 14, fontWeight: '600', color: t.text, marginBottom: spacing[2], marginTop: spacing[3] },
    input: {
      backgroundColor: t.surfaceSubtle,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radii.sm,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      color: t.text,
      fontSize: 15,
    },
    boton: {
      marginTop: spacing[5],
      backgroundColor: t.accent,
      borderRadius: radii.md,
      paddingVertical: spacing[4],
      alignItems: 'center',
    },
    botonDeshabilitado: { opacity: 0.6 },
    botonTexto: { color: t.onAccent, fontWeight: '700', fontSize: 16 },
    link: { marginTop: spacing[4], alignItems: 'center' },
    linkTexto: { color: t.textMuted, fontSize: 15 },
    linkStrong: { color: t.accent, fontWeight: '700' },
  });
}
