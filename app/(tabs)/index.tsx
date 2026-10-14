import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { login } from '@/lib/auth';

export default function HomeScreen() {
  const router = useRouter();
  // Al crear una cuenta redirigimos aquí con el correo ya escrito.
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(emailParam ?? '');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  // Si llegamos desde el registro, rellenamos el correo aunque la pantalla
  // ya estuviera montada.
  useEffect(() => {
    // El correo solo se rellena una vez al llegar con el parámetro; la regla
    // `set-state-in-effect` de React Compiler da falso positivo aquí.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa correo y contraseña.');
      return;
    }
    setCargando(true);
    try {
      const sesion = await login(email, password);
      Alert.alert('¡Éxito!', `Bienvenido a Pistolet Móvil, ${sesion.user.nombre}`);

      // Navegamos al catálogo
      router.replace('/catalogo');
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ??
        error?.message ??
        'No se pudo iniciar sesión. Revisa tus credenciales.';
      Alert.alert('Error', msg);
    } finally {
      setCargando(false);
    }
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