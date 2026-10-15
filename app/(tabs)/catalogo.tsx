// =====================================================================
//  PISTOLET · Catálogo de productos con búsqueda y paginación en el
//  servidor (en lugar de traer todo y filtrar en el cliente).
//
//  Contrato con el backend (GET /api/productos):
//    ?q        → término de búsqueda (nombre, usa índice pg_trgm)
//    ?page     → número de página (inicia en 1)
//    ?pageSize → renglones por página
//  Respuesta:  { data: Producto[], total, page, pageSize, totalPages }
// =====================================================================
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { API_PRODUCTOS, API_TIMEOUT_MS, IMAGENES_PRODUCTOS } from '@/constants/api';
import { fonts, radii, spacing, type Theme } from '@/constants/design.generated';
import { cargarSesion, obtenerPerfil } from '@/lib/auth';
import { carritoStore, useCarrito } from '@/lib/carrito';
import { useTheme, type ThemeShadows } from '@/lib/theme';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;

// Solo 'inicial' reemplaza la pantalla por un spinner a pantalla completa.
// El resto (búsqueda, refresco, paginar) mantiene montada la barra de
// búsqueda para que el teclado NO se cierre al escribir.
type ModoCarga = 'inicial' | 'busqueda' | 'refresco' | 'mas';

type Producto = {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  imagen: string | null;
};

/** Iniciales del nombre para el círculo de perfil (fallback sin foto). */
function inicialesDe(nombre: string): string {
  return (
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('') || 'MI'
  );
}

export default function CatalogoTabsScreen() {
  const router = useRouter();
  const { theme, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(theme, shadows), [theme, shadows]);
  const carrito = useCarrito();
  const conteoCarrito = Object.values(carrito).reduce(
    (total, item) => total + item.cantidad,
    0,
  );

  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Avatar del header: nombre y foto. Se refrescan cada vez que esta
  // pantalla vuelve a tener el foco (p. ej. al regresar de "Mi perfil").
  const [nombrePerfil, setNombrePerfil] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const pidiendoAvatar = useRef(false);

  // Refs para evitar carreras: respuestas viejas, dobles "load more",
  // y para que los callbacks lean siempre el valor actual.
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const seqRef = useRef(0);
  const searchTermRef = useRef('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProductos = useCallback(async (modo: ModoCarga, term: string) => {
    const reset = modo !== 'mas';
    if (!reset && (!hasMoreRef.current || loadingRef.current)) return;
    loadingRef.current = true;
    const seq = ++seqRef.current;

    if (modo === 'inicial') {
      setLoading(true);
    } else if (modo === 'busqueda') {
      setBuscando(true);
    } else if (modo === 'refresco') {
      setRefreshing(true);
    } else {
      setLoadingMore(true);
    }

    const nextPage = reset ? 1 : pageRef.current + 1;

    try {
      const response = await axios.get(API_PRODUCTOS, {
        params: { q: term.trim(), page: nextPage, pageSize: PAGE_SIZE },
        timeout: API_TIMEOUT_MS,
      });

      // Si hay una búsqueda/página más nueva en vuelo, descartamos esta.
      if (seq !== seqRef.current) return;

      // Compatibilidad con backends que aún devuelven un arreglo plano:
      // se trata como una sola página.
      const payload = response.data;
      const { data, totalPages: tp } = Array.isArray(payload)
        ? { data: payload, totalPages: 1 }
        : payload;

      pageRef.current = nextPage;
      hasMoreRef.current = nextPage < (tp ?? 1);
      setProductos((prev) => (reset ? data : [...prev, ...data]));
    } catch {
      // Sin logs en consola: el usuario puede soltar para refrescar.
    } finally {
      if (seq === seqRef.current) {
        loadingRef.current = false;
        setLoading(false);
        setBuscando(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Foto de perfil del header. Primero pintamos lo que ya está en la
  // sesión guardada (sin red) y después refrescamos con GET /api/me, así
  // el círculo se actualiza solo al cambiar la foto.
  const cargarAvatar = useCallback(async () => {
    const sesion = await cargarSesion();
    if (sesion?.user) {
      setNombrePerfil(sesion.user.nombre);
      setAvatarUrl(sesion.user.avatar_url ?? null);
    }

    if (pidiendoAvatar.current) return;
    pidiendoAvatar.current = true;
    try {
      const perfil = await obtenerPerfil();
      setNombrePerfil(perfil.nombre);
      setAvatarUrl(perfil.avatar_url);
    } catch {
      // Sin perfil fresco seguimos mostrando lo guardado (o las iniciales).
    } finally {
      pidiendoAvatar.current = false;
    }
  }, []);

  // Recargamos al volver a esta pantalla (p. ej. desde "Mi perfil").
  useFocusEffect(
    useCallback(() => {
      cargarAvatar();
    }, [cargarAvatar]),
  );

  // Carga inicial. Al desmontar se invalidan requests y el debounce.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProductos('inicial', '');
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      seqRef.current++; // invalida cualquier request pendiente
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [fetchProductos]);

  // Búsqueda con debounce: espera a que el usuario deje de teclear.
  const handleSearch = (text: string) => {
    setSearchTerm(text);
    searchTermRef.current = text;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchProductos('busqueda', text);
    }, DEBOUNCE_MS);
  };

  const onRefresh = useCallback(() => {
    fetchProductos('refresco', searchTermRef.current);
  }, [fetchProductos]);

  // Scroll infinito: al acercarse al final pide la siguiente página.
  const onEndReached = useCallback(() => {
    fetchProductos('mas', searchTermRef.current);
  }, [fetchProductos]);

  const agregarAlCarrito = (item: Producto) => {
    carritoStore.agregar({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      stock: item.stock,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const renderFooter = () => {
    if (loadingMore) {
      return <ActivityIndicator style={styles.footerSpinner} color={theme.accent} />;
    }
    if (productos.length > 0 && !hasMoreRef.current) {
      return <Text style={styles.endOfList}>— Fin del catálogo —</Text>;
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      {/* 1. SECCIÓN SUPERIOR: Logo, Carrito y Perfil */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/carrito')}>
            <Ionicons name="cart-outline" size={26} color={theme.text} />
            {conteoCarrito > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{conteoCarrito}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileCircle}
            onPress={() => router.push('/perfil')}>
            {avatarUrl ? (
              <ExpoImage
                source={{ uri: avatarUrl }}
                style={styles.profileImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Text style={styles.profileText}>{inicialesDe(nombrePerfil)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. BARRA DE BÚSQUEDA */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Busca tu pan favorito..."
          placeholderTextColor={theme.textMuted}
          value={searchTerm}
          onChangeText={handleSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
        {buscando ? (
          <ActivityIndicator size="small" color={theme.textMuted} style={{ marginLeft: 10 }} />
        ) : (
          <Ionicons name="search-outline" size={20} color={theme.textMuted} style={{ marginLeft: 10 }} />
        )}
      </View>

      {/* 3. BANNER */}
      <View style={styles.banner}>
        <Image
          source={require('../../assets/images/favicon.png')}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>Tradición y Sabor</Text>
          <Text style={styles.bannerSubtitle}>Desde 1997 endulzando tus momentos</Text>
        </View>
      </View>

      {/* 4. CATÁLOGO */}
      <FlatList
        data={productos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.imagen ? (
              <Image
                source={{ uri: `${IMAGENES_PRODUCTOS}/${item.imagen}?t=${new Date().getTime()}` }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : null}
            <View style={styles.info}>
              <Text style={styles.name}>{item.nombre}</Text>
              <Text style={styles.price}>${item.precio.toFixed(2)}</Text>
              <Text style={styles.stock}>Disponibles: {item.stock} pzas</Text>
              <TouchableOpacity
                style={[styles.addButton, item.stock <= 0 && styles.addButtonDisabled]}
                disabled={item.stock <= 0}
                onPress={() => agregarAlCarrito(item)}>
                <Text style={[styles.addButtonText, item.stock <= 0 && styles.addButtonTextDisabled]}>
                  {item.stock > 0 ? 'Agregar' : 'Agotado'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.accent]}
            tintColor={theme.accent}
          />
        }
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay panes con ese nombre.</Text>
        }
        ListFooterComponent={renderFooter}
      />
    </KeyboardAvoidingView>
  );
}

function makeStyles(t: Theme, sh: ThemeShadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
    loadingWrap: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing[5],
      marginBottom: spacing[4],
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
    logo: { width: 120, height: 40 },
    cartButton: { position: 'relative', padding: 4 },
    cartBadge: {
      position: 'absolute',
      top: -4,
      right: -6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    cartBadgeText: { color: t.onAccent, fontSize: 11, fontWeight: '700' },
    profileCircle: {
      width: 45,
      height: 45,
      borderRadius: 22.5,
      backgroundColor: t.surfaceSubtle,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.copper,
      overflow: 'hidden',
    },
    profileImage: { width: '100%', height: '100%' },
    profileText: { color: t.heading, fontWeight: '700', fontSize: 16 },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: t.border,
      marginHorizontal: spacing[5],
      paddingHorizontal: spacing[4],
      marginBottom: spacing[4],
      ...sh.sm,
    },
    searchInput: { flex: 1, height: 50, color: t.text, fontSize: 16 },
    banner: { width: '100%', height: 120, marginBottom: spacing[4], position: 'relative' },
    bannerImage: { width: '100%', height: '100%', backgroundColor: t.inverseBg, opacity: 0.8 },
    bannerTextContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing[5],
    },
    bannerTitle: {
      fontSize: 24,
      fontFamily: fonts.display,
      fontWeight: '700',
      color: t.heading,
      textAlign: 'center',
    },
    bannerSubtitle: { fontSize: 14, color: t.inverseText, textAlign: 'center', marginTop: spacing[1] },
    listContent: { paddingHorizontal: spacing[4], paddingBottom: 100 },
    row: { justifyContent: 'space-between' },
    card: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radii.lg,
      width: '48%',
      marginBottom: spacing[4],
      padding: spacing[3],
      ...sh.sm,
    },
    image: { width: '100%', height: 130, borderRadius: radii.md, marginBottom: spacing[3] },
    info: { alignItems: 'center' },
    name: { fontSize: 16, fontWeight: '700', color: t.text, textAlign: 'center' },
    price: { fontSize: 15, color: t.accent, fontWeight: '700', marginTop: 3 },
    stock: { fontSize: 11, color: t.textMuted, marginTop: 4 },
    addButton: {
      alignSelf: 'stretch',
      backgroundColor: t.accent,
      borderRadius: radii.sm,
      paddingVertical: spacing[2],
      alignItems: 'center',
      marginTop: spacing[2],
    },
    addButtonDisabled: { backgroundColor: t.surfaceSubtle },
    addButtonText: { color: t.onAccent, fontWeight: '700', fontSize: 13 },
    addButtonTextDisabled: { color: t.textMuted },
    emptyText: { textAlign: 'center', marginTop: 50, color: t.textMuted, fontSize: 16 },
    footerSpinner: { marginVertical: spacing[5] },
    endOfList: { textAlign: 'center', color: t.textMuted, fontSize: 12, marginVertical: spacing[5] },
  });
}
