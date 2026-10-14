import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../services/products';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './products.html',
  styleUrls: ['./products.css']
})
export class ProductsComponent implements OnInit {
  cargando = true;
  catalogo: any[] = [];

  constructor(
    private productosService: ProductsService,
    private cdr: ChangeDetectorRef
  ) {}

  // Arma la URL de la imagen del producto (vive en el backend)
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
    this.productosService.obtenerProductos().subscribe({
      next: (panes: any[]) => {
        this.catalogo = (panes ?? []).map((pan: any) => ({
          id: pan.id,
          nombre: pan.nombre,
          precio: Number(pan.precio),
          imagen: this.resolverImagen(pan.imagen)
        }));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.catalogo = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
