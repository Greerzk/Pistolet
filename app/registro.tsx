// =====================================================================
//  PISTOLET · Registro de clientes (app móvil)
//    POST /api/register  { nombre, email, password, telefono? }
//
//  Igual que la web: siempre crea cuentas con rol 'cliente'.
//  Validación de campos en el cliente + mensajes en modal.
// =====================================================================
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errores = Partial<Record<'nombre' | 'email' | 'telefono' | 'password' | 'confirmar', string>>;

type Aviso = {
  visible: boolean;
  tipo: TipoAviso;
  titulo: string;
  mensaje?: string;
  textoBoton?: string;
  alCerrar?: () => void;
};

type CampoProps = {
  etiqueta: string;
  valor: string;
  alCambiar: (texto: string) => void;
  error?: string;
  derecha?: React.ReactNode;
} & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText' | 'style'>;

function Campo({ etiqueta, valor, alCambiar, error, derecha, ...props }: CampoProps) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={alCambiar}
          placeholderTextColor="#8D6E63"
          {...props}
        />
        {derecha}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function RegistroScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPassword, setVerPassword] = useState(false);

  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>({ visible: false, tipo: 'info', titulo: '' });

  const validar = (): Errores => {
    const e: Errores = {};

    if (!nombre.trim()) e.nombre = 'Escribe tu nombre completo.';
    else if (nombre.trim().length < 3) e.nombre = 'El nombre es demasiado corto.';

    if (!email.trim()) e.email = 'Escribe tu correo.';
    else if (!REGEX_EMAIL.test(email.trim())) e.email = 'El correo no es válido.';

    if (telefono.trim() && !/^\d{10}$/.test(telefono.trim()))
      e.telefono = 'El teléfono debe tener 10 dígitos.';

    if (!password) e.password = 'Escribe una contraseña.';
    else if (password.length < 6) e.password = 'La contraseña debe tener al menos 6 caracteres.';

    if (!confirmar) e.confirmar = 'Repite la contraseña.';
    else if (confirmar !== password) e.confirmar = 'Las contraseñas no coinciden.';

    return e;
  };

  const cerrarAviso = () => {
    const alCerrar = aviso.alCerrar;
    setAviso((previo) => ({ ...previo, visible: false }));
    alCerrar?.();
  };

  const registrar = async () => {
    const e = validar();
    setErrores(e);

    if (Object.keys(e).length > 0) {
      setAviso({
        visible: true,
        tipo: 'aviso',
        titulo: 'Revisa tus datos',
        mensaje: 'Corrige los campos marcados para continuar.',
      });
      return;
    }

    const correo = email.trim().toLowerCase();
    setEnviando(true);
    try {
      await registrarCliente({
        nombre: nombre.trim(),
        email: correo,
        password,
        telefono: telefono.trim() || undefined,
      });
      setAviso({
        visible: true,
        tipo: 'exito',
        titulo: '¡Bienvenido a la familia Pistolet!',
        mensaje: 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.',
        textoBoton: 'Ir a iniciar sesión',
        alCerrar: () => router.replace({ pathname: '/', params: { email: correo } }),
      });
    } catch (error: any) {
      const mensaje =
        error?.response?.data?.error ??
        error?.message ??
        'No se pudo crear la cuenta. Intenta de nuevo.';
      setAviso({
        visible: true,
        tipo: 'error',
        titulo: 'No se pudo crear la cuenta',
        mensaje,
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#5D4037" />
          <Text style={styles.backText}>Regresar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Crear Cuenta</Text>
        <Text style={styles.subtitle}>Únete a la familia Pistolet</Text>

        <Campo
          etiqueta="Nombre completo"
          valor={nombre}
          alCambiar={setNombre}
          error={errores.nombre}
          placeholder="Tu nombre"
          autoCapitalize="words"
        />

        <Campo
          etiqueta="Correo"
          valor={email}
          alCambiar={setEmail}
          error={errores.email}
          placeholder="tucorreo@ejemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />

        <Campo
          etiqueta="Teléfono (opcional)"
          valor={telefono}
          alCambiar={(texto) => setTelefono(texto.replace(/[^0-9]/g, ''))}
          error={errores.telefono}
          placeholder="10 dígitos"
          keyboardType="phone-pad"
          maxLength={10}
        />

        <Campo
          etiqueta="Contraseña"
          valor={password}
          alCambiar={setPassword}
          error={errores.password}
          placeholder="Mínimo 6 caracteres"
          secureTextEntry={!verPassword}
          autoCapitalize="none"
          derecha={
            <TouchableOpacity onPress={() => setVerPassword((v) => !v)} style={styles.ojo}>
              <Ionicons
                name={verPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#A1887F"
              />
            </TouchableOpacity>
          }
        />

        <Campo
          etiqueta="Confirmar contraseña"
          valor={confirmar}
          alCambiar={setConfirmar}
          error={errores.confirmar}
          placeholder="Repite tu contraseña"
          secureTextEntry={!verPassword}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, enviando && styles.buttonDisabled]}
          disabled={enviando}
          onPress={registrar}>
          {enviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>CREAR CUENTA</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.back()}>
          <Text style={styles.linkText}>
            ¿Ya tienes cuenta? <Text style={styles.linkStrong}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ModalAviso
        visible={aviso.visible}
        tipo={aviso.tipo}
        titulo={aviso.titulo}
        mensaje={aviso.mensaje}
        textoBoton={aviso.textoBoton ?? 'Entendido'}
        onCerrar={cerrarAviso}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5' },
  scroll: {
    padding: 25,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
  },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { color: '#5D4037', fontWeight: '600', marginLeft: 6, fontSize: 15 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#5D4037', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8D6E63', textAlign: 'center', marginBottom: 30, marginTop: 4 },
  campo: { marginBottom: 16 },
  etiqueta: { color: '#5D4037', fontWeight: '600', fontSize: 13, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EDE3',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  inputError: { borderWidth: 1.5, borderColor: '#B71C1C' },
  input: { flex: 1, height: 52, color: '#5D4037', fontSize: 16 },
  ojo: { padding: 4, marginLeft: 6 },
  errorText: { color: '#B71C1C', fontSize: 12, marginTop: 5, marginLeft: 4 },
  button: {
    backgroundColor: '#5D4037',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  linkRow: { marginTop: 22, alignItems: 'center' },
  linkText: { color: '#8D6E63', fontSize: 14 },
  linkStrong: { color: '#5D4037', fontWeight: 'bold' },
});
