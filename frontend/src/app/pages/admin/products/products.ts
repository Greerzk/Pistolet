import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ProductService } from '../../../services/product';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

declare var bootstrap: any;

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class AdminProductsComponent implements OnInit {
  productos: any[] = [];
  categorias: any[] = [];
  cargando: boolean = true;
  selectedFile: File | null = null;
  esEdicion: boolean = false;
  idProductoSeleccionado: number | null = null;
  terminoBusqueda: string = '';

  constructor(private productService: ProductService, private cdr: ChangeDetectorRef) {}

  get productosFiltrados(): any[] {
    const q = this.terminoBusqueda.toLowerCase().trim();
    if (!q) return this.productos;
    return this.productos.filter(p =>
      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
      (p.precio && p.precio.toString().includes(q))
    );
  }

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarCategorias();
  }

  cargarCategorias() {
    this.productService.getCategorias().subscribe({
      next: (data) => { this.categorias = data; this.cdr.detectChanges(); },
      error: () => { this.categorias = []; }
    });
  }

  // Arma la URL de la imagen (vive en el backend)
  obtenerUrlImagen(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return 'img/PISTOLET 2.png';
    }
    url = url.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (!url.includes('/')) {
      return `${environment.imgUrl}/productos/pan/${url}`;
    }
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${environment.imgUrl.replace('/img', '')}${cleanUrl}`;
  }

  onImagenError(event: any) {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('PISTOLET')) {
      target.src = 'img/PISTOLET 2.png';
    }
  }

  cargarProductos() {
    this.cargando = true;
    this.productService.getAll().subscribe({
      next: (data) => { this.productos = data; this.cargando = false; this.cdr.detectChanges(); },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
  }

  prepararCrear() {
    this.esEdicion = false;
    this.idProductoSeleccionado = null;
    this.selectedFile = null;
    const form = document.getElementById('formProducto') as HTMLFormElement;
    form.reset();
    new bootstrap.Modal(document.getElementById('modalNuevoProducto')).show();
  }

  prepararEditar(producto: any) {
    this.esEdicion = true;
    this.idProductoSeleccionado = producto.id;
    this.selectedFile = null;
    new bootstrap.Modal(document.getElementById('modalNuevoProducto')).show();

    setTimeout(() => {
      const form = document.getElementById('formProducto') as HTMLFormElement;
      if (form) {
        form['nombre'].value = producto.nombre || '';
        form['descripcion'].value = producto.descripcion || '';
        form['precio'].value = producto.precio;
        form['stock'].value = producto.stock;
        form['stock_minimo'].value = producto.stock_minimo || 0;
        form['categoria_id'].value = producto.categoria_id || '';
        form['imagen_actual'].value = producto.imagen || '';
      }
    }, 150);
  }

  onFileSelected(event: any) { this.selectedFile = event.target.files[0]; }

  guardarProducto(event: any) {
    event.preventDefault();
    const formElement = event.target as HTMLFormElement;
    const formData = new FormData(formElement);
    // Solo adjuntamos el archivo si el usuario eligió uno nuevo
    if (this.selectedFile) formData.append('imagen', this.selectedFile);

    if (this.esEdicion && this.idProductoSeleccionado) {
      this.productService.update(this.idProductoSeleccionado, formData).subscribe({
        next: () => {
          this.cerrarModal('modalNuevoProducto');
          this.cargarProductos();
          setTimeout(() => {
            Swal.fire('¡Éxito!', 'Producto actualizado correctamente', 'success');
          }, 200);
        },
        error: (err) => {
          setTimeout(() => {
            Swal.fire('Error', err.error?.error || 'No se pudo actualizar el producto', 'error');
          }, 200);
        }
      });
    } else {
      this.productService.create(formData).subscribe({
        next: () => {
          this.cerrarModal('modalNuevoProducto');
          this.cargarProductos();
          setTimeout(() => {
            Swal.fire('¡Éxito!', 'Producto creado correctamente', 'success');
          }, 200);
        },
        error: (err) => {
          setTimeout(() => {
            Swal.fire('Error', err.error?.error || 'No se pudo crear el producto', 'error');
          }, 200);
        }
      });
    }
  }

  private cerrarModal(modalId: string) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    }
  }

  eliminar(id: number) {
    Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar'
    }).then((r: any) => {
      if (r.isConfirmed) {
        this.productService.delete(id).subscribe({
          next: () => {
            this.cargarProductos();
            setTimeout(() => {
              Swal.fire('Eliminado', 'El producto ha sido eliminado', 'success');
            }, 100);
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar el producto', 'error')
        });
      }
    });
  }
}
