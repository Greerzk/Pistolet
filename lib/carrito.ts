// =====================================================================
//  PISTOLET · Carrito global (memoria, por sesión de la app)
//
//  Se usa useSyncExternalStore para que cualquier pantalla se
//  re-renderice cuando el carrito cambia. No requiere contexto.
// =====================================================================
import { useSyncExternalStore } from 'react';

export type ProductoCarrito = {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
};

type ItemCarrito = {
  producto: ProductoCarrito;
  cantidad: number;
};

type Carrito = Record<number, ItemCarrito>;

let carrito: Carrito = {};
const listeners = new Set<() => void>();

function emitir() {
  for (const listener of listeners) listener();
}

export const carritoStore = {
  suscribirse(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  obtenerSnapshot(): Carrito {
    return carrito;
  },

  agregar(producto: ProductoCarrito, cantidad = 1) {
    const previo = carrito[producto.id];
    const disponible = previo ? previo.cantidad + cantidad : cantidad;
    carrito = {
      ...carrito,
      [producto.id]: {
        producto,
        cantidad: Math.min(disponible, producto.stock),
      },
    };
    emitir();
  },

  setCantidad(productoId: number, cantidad: number) {
    const item = carrito[productoId];
    if (!item) return;
    if (cantidad <= 0) {
      carritoStore.quitar(productoId);
      return;
    }
    carrito = {
      ...carrito,
      [productoId]: {
        producto: item.producto,
        cantidad: Math.min(cantidad, item.producto.stock),
      },
    };
    emitir();
  },

  quitar(productoId: number) {
    const copia = { ...carrito };
    delete copia[productoId];
    carrito = copia;
    emitir();
  },

  limpiar() {
    carrito = {};
    emitir();
  },

  conteo(): number {
    return Object.values(carrito).reduce((total, item) => total + item.cantidad, 0);
  },

  total(): number {
    return Object.values(carrito).reduce(
      (total, item) => total + item.cantidad * item.producto.precio,
      0,
    );
  },
};

export function useCarrito(): Carrito {
  return useSyncExternalStore(carritoStore.suscribirse, carritoStore.obtenerSnapshot);
}

// Serializa el carrito para el body de crear_pedido()
export function carritoAItems(carritoActual: Carrito) {
  return Object.values(carritoActual).map((item) => ({
    producto_id: item.producto.id,
    cantidad: item.cantidad,
  }));
}