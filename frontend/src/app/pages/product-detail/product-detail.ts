import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../services/products';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.css']
})
export class ProductDetailComponent implements OnInit {
  producto: any = null;
  cargando = true;

  constructor(
    private route: ActivatedRoute,
    private productosService: ProductsService,
    private cdr: ChangeDetectorRef
  ) {}

  resolverImagen(url: string | null | undefined): string {
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.productosService.obtenerProductoPorId(id).subscribe({
        next: (datos: any) => {
          const panEncontrado = Array.isArray(datos) ? datos[0] : datos;

          if (panEncontrado) {
            this.producto = {
              id: panEncontrado.id,
              nombre: panEncontrado.nombre,
              descripcion: panEncontrado.descripcion || 'Descripción no disponible.',
              precio: Number(panEncontrado.precio),
              stock: panEncontrado.stock || 0,
              imagen: this.resolverImagen(panEncontrado.imagen)
            };
          }
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cargando = false;
          this.cdr.detectChanges();
          // Sin logs en consola: el aviso se muestra en un modal.
          Swal.fire({
            icon: 'error',
            title: 'Producto no disponible',
            text: 'No pudimos cargar este producto. Inténtalo de nuevo.',
            confirmButtonText: 'Entendido'
          });
        }
      });
    }
  }
}
