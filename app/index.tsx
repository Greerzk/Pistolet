// =====================================================================
//  PISTOLET · Pantalla de inicio de sesion
//
//  Es la ruta raiz ("/"). Antes vivia dentro del grupo (tabs)/, lo que
//  hacia que el login apareciera con barra inferior; ahora es una
//  pantalla del Stack raiz, a pantalla completa.
// =====================================================================
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import ModalAviso, { TipoAviso } from '@/components/modal-aviso';
import { fonts, radii, spacing, type Theme } from '@/constants/design.generated';
import { login } from '@/lib/auth';
import { useTheme, type ThemeShadows } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { theme, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(theme, shadows), [theme, shadows]);

  // Al crear una cuenta redirigimos aquí con el correo ya escrito.
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(emailParam ?? '');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<{ visible: boolean; titulo: string; mensaje?: string; tipo?: TipoAviso }>({
    visible: false,
    titulo: '',
  });
  const [bienvenida, setBienvenida] = useState<{ visible: boolean; nombre: string }>({ visible: false, nombre: '' });
  // Aviso cuando se intenta iniciar sesión con una cuenta ya eliminada.
  const [eliminada, setEliminada] = useState<{ visible: boolean; mensaje: string }>({
    visible: false,
    mensaje: '',
  });

  const mostrarAviso = (titulo: string, mensaje?: string, tipo: TipoAviso = 'info') => {
    setAviso({ visible: true, titulo, mensaje, tipo });
  };

  useEffect(() => {
    if (emailParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleLogin = async () => {
    if (!email || !password) {
      mostrarAviso('Error', 'Ingresa correo y contraseña.', 'error');
      return;
    }
    setCargando(true);
    try {
      const sesion = await login(email, password);
      setBienvenida({ visible: true, nombre: sesion.user.nombre });
    } catch (error: any) {
      const datos = error?.response?.data;

      // La cuenta existe pero fue eliminada: ofrecemos registrarse de nuevo.
      if (datos?.codigo === 'CUENTA_ELIMINADA') {
        setEliminada({
          visible: true,
          mensaje: datos?.error ?? 'Tu cuenta fue eliminada. Regístrate de nuevo para reactivarla.',
        });
        return;
      }

      const msg =
        datos?.error ??
        error?.message ??
        'No se pudo iniciar sesión. Revisa tus credenciales.';
      mostrarAviso('Error', msg, 'error');
    } finally {
      setCargando(false);
    }
  };

  const irACatalogo = () => {
    setBienvenida({ visible: false, nombre: '' });
    router.replace('/catalogo');
  };

  const irARegistro = () => {
    setEliminada({ visible: false, mensaje: '' });
    router.push('/registro');
  };

  return (
    <View style={styles.container}>
      {/* --- LOGO DE LA PANADERÍA --- */}
      <Image
        source={require('../assets/images/MainLogo.png')}
        style={styles.logo}
        resizeMode="cover"
      />

      <Text style={styles.title}>Pistolet</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo"
        placeholderTextColor={theme.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, cargando && { opacity: 0.6 }]}
        disabled={cargando}
        onPress={handleLogin}>
        <Text style={styles.buttonText}>{cargando ? 'ACCEDIENDO...' : 'ACCEDER'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.link} onPress={() => router.push('/registro')}>
        <Text style={styles.linkText}>
          ¿No tienes cuenta? <Text style={styles.linkStrong}>Crear cuenta</Text>
        </Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Desde 1997</Text>

      <ModalAviso
        visible={aviso.visible}
        titulo={aviso.titulo}
        mensaje={aviso.mensaje}
        tipo={aviso.tipo}
        onCerrar={() => setAviso((prev) => ({ ...prev, visible: false }))}
      />
      <ModalAviso
        visible={bienvenida.visible}
        tipo="exito"
        titulo="¡Bienvenido a Pistolet!"
        mensaje={`Hola ${bienvenida.nombre}, vamos al catálogo.`}
        textoBoton="Continuar"
        onCerrar={irACatalogo}
      />
      <ModalAviso
        visible={eliminada.visible}
        tipo="aviso"
        titulo="Cuenta eliminada"
        mensaje={eliminada.mensaje}
        textoBoton="Registrarme de nuevo"
        onCerrar={irARegistro}
        textoCancelar="Cerrar"
        onCancelar={() => setEliminada({ visible: false, mensaje: '' })}
      />
    </View>
  );
}

function makeStyles(t: Theme, sh: ThemeShadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[8],
    },
    logo: {
      width: 120,
      height: 120,
      borderRadius: radii.lg,
      marginBottom: spacing[5],
      borderWidth: 2,
      borderColor: t.border,
    },
    title: {
      fontSize: 34,
      fontFamily: fonts.display,
      fontWeight: '700',
      color: t.heading,
      marginBottom: spacing[10],
    },
    input: {
      width: '100%',
      height: 55,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radii.md,
      marginBottom: spacing[5],
      paddingHorizontal: spacing[4],
      color: t.text,
      fontSize: 16,
    },
    button: {
      backgroundColor: t.accent,
      padding: 18,
      borderRadius: radii.md,
      width: '100%',
      alignItems: 'center',
      marginTop: spacing[2],
      ...sh.md,
    },
    buttonText: {
      color: t.onAccent,
      fontWeight: '700',
      fontSize: 16,
      letterSpacing: 1,
    },
    footer: {
      marginTop: spacing[8],
      color: t.textMuted,
      fontSize: 12,
    },
    link: {
      marginTop: spacing[5],
    },
    linkText: {
      color: t.textMuted,
      fontSize: 14,
    },
    linkStrong: {
      color: t.accent,
      fontWeight: '700',
    },
  });
}
