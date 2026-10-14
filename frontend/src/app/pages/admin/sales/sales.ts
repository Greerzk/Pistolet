import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaleService } from '../../../services/sale';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-admin-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.html'
})
export class AdminSalesComponent implements OnInit {
  ventas: any[] = [];
  detalles: any[] = [];
  ventaSeleccionada: any = null;
  terminoBusqueda: string = '';

  constructor(private saleService: SaleService, private cdr: ChangeDetectorRef) {}

  get ventasFiltradas(): any[] {
    const q = this.terminoBusqueda.toLowerCase().trim();
    if (!q) return this.ventas;
    return this.ventas.filter(v => 
      (v.folio && v.folio.toString().toLowerCase().includes(q)) ||
      (v.estado && v.estado.toLowerCase().includes(q)) ||
      (v.total && v.total.toString().includes(q))
    );
  }

  cargando: boolean = false;

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.saleService.getAll().subscribe({
      next: (res: any) => {
        this.ventas = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  verDetalle(v: any): void {
    this.ventaSeleccionada = v;
    this.saleService.getDetails(v.id).subscribe((res: any) => {
      this.detalles = res;
      const modal = new bootstrap.Modal(document.getElementById('modalDetalle'));
      modal.show();
      this.cdr.detectChanges();
    });
  }

  anular(id: number): void {
    Swal.fire({
      title: '¿Anular venta?',
      text: "El stock regresará al inventario",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.saleService.cancel(id).subscribe({
          next: () => {
            this.cargar();
            setTimeout(() => {
              Swal.fire('Anulada', 'Venta cancelada correctamente', 'success');
            }, 100);
          },
          error: () => Swal.fire('Error', 'No se pudo anular la venta', 'error')
        });
      }
    });
  }
}