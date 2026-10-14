import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IngredientService } from '../../../services/ingredient';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-admin-ingredients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ingredients.html'
})
export class AdminIngredientsComponent implements OnInit {
  insumos: any[] = [];
  esEdicion: boolean = false;
  idInsumoSeleccionado: number | null = null;
  terminoBusqueda: string = '';
  cargando: boolean = false;

  constructor(
    private ingredientService: IngredientService,
    private cdr: ChangeDetectorRef
  ) {}

  get insumosFiltrados(): any[] {
    const q = this.terminoBusqueda.toLowerCase().trim();
    if (!q) return this.insumos;
    return this.insumos.filter(i =>
      (i.nombre && i.nombre.toLowerCase().includes(q)) ||
      (i.unidad && i.unidad.toLowerCase().includes(q)) ||
      (i.proveedor && i.proveedor.toLowerCase().includes(q))
    );
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.ingredientService.getAll().subscribe({
      next: (res: any) => {
        this.insumos = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  prepararCrear() {
    this.esEdicion = false;
    this.idInsumoSeleccionado = null;
    (document.getElementById('formInsumo') as HTMLFormElement).reset();
    new bootstrap.Modal(document.getElementById('modalInsumo')).show();
  }

  prepararEditar(item: any) {
    this.esEdicion = true;
    this.idInsumoSeleccionado = item.id;
    new bootstrap.Modal(document.getElementById('modalInsumo')).show();

    setTimeout(() => {
      (document.getElementById('nombre') as HTMLInputElement).value = item.nombre || '';
      (document.getElementById('unidad') as HTMLSelectElement).value = item.unidad || '';
      (document.getElementById('stock') as HTMLInputElement).value = item.stock;
      (document.getElementById('stock_minimo') as HTMLInputElement).value = item.stock_minimo || 0;
      (document.getElementById('proveedor') as HTMLInputElement).value = item.proveedor || '';
    }, 100);
  }

  guardar(event: any) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const datos = {
      nombre: formData.get('nombre'),
      unidad: formData.get('unidad'),
      stock: formData.get('stock'),
      stock_minimo: formData.get('stock_minimo'),
      proveedor: formData.get('proveedor') || null
    };

    const request = this.esEdicion && this.idInsumoSeleccionado
      ? this.ingredientService.update(this.idInsumoSeleccionado, datos)
      : this.ingredientService.create(datos);

    request.subscribe({
      next: () => {
        const modalElement = document.getElementById('modalInsumo');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          if (modal) modal.hide();
        }
        document.getElementById('btnCerrarModal')?.click();
        this.cargar();
        setTimeout(() => {
          Swal.fire('¡Éxito!', 'Inventario actualizado correctamente', 'success');
        }, 200);
      },
      error: (err: any) => {
        setTimeout(() => {
          Swal.fire('Error', err.error?.error || err.error?.message || 'Error al guardar el insumo', 'error');
        }, 200);
      }
    });
  }

  eliminar(id: number) {
    Swal.fire({
      title: '¿Eliminar insumo?',
      text: 'No se podrá borrar si está en uso.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (r.isConfirmed) {
        this.ingredientService.delete(id).subscribe({
          next: () => {
            this.cargar();
            setTimeout(() => {
              Swal.fire('Eliminado', 'Insumo eliminado correctamente', 'success');
            }, 100);
          },
          error: () => Swal.fire('Error', 'Insumo en uso en recetas activas', 'error')
        });
      }
    });
  }
}
