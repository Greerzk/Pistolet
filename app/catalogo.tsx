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
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import { API_PRODUCTOS, IMAGENES_PRODUCTOS } from '@/constants/api';
import { carritoStore, useCarrito } from '@/lib/carrito';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;

type Producto = {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  imagen: string | null;
};

export default function CatalogoTabsScreen() {
  const router = useRouter();
  const carrito = useCarrito();
  const conteoCarrito = Object.values(carrito).reduce(
    (total, item) => total + item.cantidad,
    0,
  );

  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Refs para evitar carreras: respuestas viejas, dobles "load more",
  // y para que los callbacks lean siempre el valor actual.
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const seqRef = useRef(0);
  const searchTermRef = useRef('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProductos = useCallback(async (reset: boolean, term: string) => {
    if (!reset && (!hasMoreRef.current || loadingRef.current)) return;
    loadingRef.current = true;
    const seq = ++seqRef.current;

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const nextPage = reset ? 1 : pageRef.current + 1;

    try {
      const response = await axios.get(API_PRODUCTOS, {
        params: { q: term.trim(), page: nextPage, pageSize: PAGE_SIZE },
        timeout: 15000,
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
    } catch (error) {
      console.error('Error cargando panes de Pistolet:', error);
    } finally {
      if (seq === seqRef.current) {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Carga inicial. Al desmontar se invalidan requests y el debounce.
  useEffect(() => {
    // Carga de datos al montar (patrón estándar en RN). La regla
    // `set-state-in-effect` de React Compiler da falso positivo aquí porque
    // el setState ocurre antes del primer await dentro de fetchProductos.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProductos(true, '');
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
      fetchProductos(true, text);
    }, DEBOUNCE_MS);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProductos(true, searchTermRef.current);
  }, [fetchProductos]);

  // Scroll infinito: al acercarse al final pide la siguiente página.
  const onEndReached = useCallback(() => {
    fetchProductos(false, searchTermRef.current);
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
      return <ActivityIndicator style={styles.footerSpinner} color="#5D4037" />;
    }
    if (productos.length > 0 && !hasMoreRef.current) {
      return <Text style={styles.endOfList}>— Fin del catálogo —</Text>;
    }
    return null;
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#5D4037" style={{ flex: 1 }} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      {/* 1. SECCIÓN SUPERIOR: Logo, Carrito y Perfil */}
      <View style={styles.header}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/carrito')}>
            <Ionicons name="cart-outline" size={26} color="#5D4037" />
            {conteoCarrito > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{conteoCarrito}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileCircle}>
            <Text style={styles.profileText}>MI</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. BARRA DE BÚSQUEDA */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Busca tu pan favorito..."
          placeholderTextColor="#A1887F"
          value={searchTerm}
          onChangeText={handleSearch}
        />
        <Ionicons name="search-outline" size={20} color="#A1887F" style={{ marginLeft: 10 }} />
      </View>

      {/* 3. BANNER */}
      <View style={styles.banner}>
        <Image
          source={require('../assets/images/favicon.png')}
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
                <Text style={styles.addButtonText}>
                  {item.stock > 0 ? 'Agregar' : 'Agotado'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5D4037']} />
        }
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5', paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  logo: { width: 120, height: 40 },
  cartButton: { position: 'relative', padding: 4 },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C8963E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  profileCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#D7CCC8',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#5D4037',
  },
  profileText: { color: '#5D4037', fontWeight: 'bold', fontSize: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchInput: { flex: 1, height: 50, color: '#5D4037', fontSize: 16 },
  searchIcon: { fontSize: 18, marginLeft: 10, color: '#A1887F' },
  banner: { width: '100%', height: 120, marginBottom: 15, position: 'relative' },
  bannerImage: { width: '100%', height: '100%', backgroundColor: '#5D4037', opacity: 0.8 },
  bannerTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  bannerSubtitle: { fontSize: 14, color: '#D7CCC8', textAlign: 'center', marginTop: 5 },
  listContent: { paddingHorizontal: 15, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '48%',
    marginBottom: 15,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  image: { width: '100%', height: 130, borderRadius: 10, marginBottom: 10 },
  info: { alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#3E2723', textAlign: 'center' },
  price: { fontSize: 15, color: '#8D6E63', fontWeight: '600', marginTop: 3 },
  stock: { fontSize: 11, color: '#A1887F', marginTop: 4 },
  addButton: {
    alignSelf: 'stretch',
    backgroundColor: '#5D4037',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: { backgroundColor: '#D7CCC8' },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#8D6E63', fontSize: 16 },
  footerSpinner: { marginVertical: 20 },
  endOfList: { textAlign: 'center', color: '#A1887F', fontSize: 12, marginVertical: 20 },
});