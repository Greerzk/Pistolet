import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import ModalAviso, { TipoAviso } from '@/components/modal-aviso';
import { login } from '@/lib/auth';

export default function HomeScreen() {
  const router = useRouter();
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
      const msg =
        error?.response?.data?.error ??
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

  return (
    <View style={styles.container}>
      {/* --- LOGO DE LA PANADERÍA --- */}
      <Image 
        source={require('../../assets/images/MainLogo.png')}
        style={styles.logo}
        resizeMode="cover"
      />

      <Text style={styles.title}>Pistolet</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Correo" 
        placeholderTextColor="#8D6E63"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Contraseña" 
        placeholderTextColor="#8D6E63"
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
        titulo="¡Bienvenido a Pistolet Móvil!"
        mensaje={`Hola ${bienvenida.nombre}, vamos al catálogo.`}
        textoBoton="Continuar"
        onCerrar={irACatalogo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFBF5', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 30 
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 20, // Borde ligeramente redondeado
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#D7CCC8',
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#5D4037', 
    marginBottom: 40 
  },
  input: { 
    width: '100%', 
    height: 55, 
    backgroundColor: '#F5EDE3', 
    borderRadius: 10, 
    marginBottom: 20, 
    paddingHorizontal: 15, 
    color: '#5D4037' 
  },
  button: { 
    backgroundColor: '#5D4037', 
    padding: 18, 
    borderRadius: 12, 
    width: '100%', 
    alignItems: 'center', 
    marginTop: 10, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 3.84, 
    elevation: 5 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  footer: { 
    marginTop: 30, 
    color: '#A1887F', 
    fontSize: 12 
  },
  link: { 
    marginTop: 18 
  },
  linkText: { 
    color: '#8D6E63', 
    fontSize: 14 
  },
  linkStrong: { 
    color: '#5D4037', 
    fontWeight: 'bold' 
  }
});