import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html'
})
export class AdminUsersComponent implements OnInit {
  usuarios: any[] = [];
  cargando: boolean = false;
  esEdicion: boolean = false;
  idUsuarioSeleccionado: number | null = null;
  terminoBusqueda: string = '';
  tabActiva: 'todos' | 'clientes' | 'admins' = 'todos';

  constructor(private userService: UserService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { 
    this.obtenerUsuarios(); 
  }

  get usuariosFiltrados(): any[] {
    return this.usuarios.filter(u => {
      const rol = (u.rol || 'cliente').toLowerCase();
      const coincideTab = this.tabActiva === 'todos' || 
        (this.tabActiva === 'clientes' && rol === 'cliente') ||
        (this.tabActiva === 'admins' && (rol === 'admin' || rol === 'empleado'));

      const q = this.terminoBusqueda.toLowerCase().trim();
      const coincideBusqueda = !q ||
        (u.nombre && u.nombre.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.rol && u.rol.toLowerCase().includes(q));

      return coincideTab && coincideBusqueda;
    });
  }

  get totalClientes(): number {
    return this.usuarios.filter(u => (u.rol || 'cliente').toLowerCase() === 'cliente').length;
  }

  get totalAdmins(): number {
    return this.usuarios.filter(u => {
      const r = (u.rol || '').toLowerCase();
      return r === 'admin' || r === 'empleado';
    }).length;
  }

  obtenerUsuarios(): void {
    this.cargando = true;
    this.userService.getAll().subscribe({
      next: (data: any[]) => { 
        this.usuarios = data; 
        this.cargando = false; 
        this.cdr.detectChanges(); 
      },
      error: () => this.cargando = false
    });
  }

  prepararCrear(): void {
    this.esEdicion = false;
    this.idUsuarioSeleccionado = null;
    const modalElement = document.getElementById('modalUsuario');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      const form = document.getElementById('formUsuario') as HTMLFormElement;
      if (form) form.reset();
      modal.show();
    }
  }

  prepararEditar(u: any): void {
    this.esEdicion = true;
    this.idUsuarioSeleccionado = u.id;
    const modalElement = document.getElementById('modalUsuario');
    if (modalElement) {
      new bootstrap.Modal(modalElement).show();
      setTimeout(() => {
        const nombreInput = document.getElementById('nombre') as HTMLInputElement;
        const emailInput = document.getElementById('email') as HTMLInputElement;
        const rolSelect = document.getElementById('rol') as HTMLSelectElement;
        
        if (nombreInput) nombreInput.value = u.nombre || '';
        if (emailInput) emailInput.value = u.email || '';
        if (rolSelect) rolSelect.value = u.rol || 'cliente';
      }, 150);
    }
  }

  // 🛠️ CORRECCIÓN: Función que busca tu formulario (submit)
  guardarUsuario(event: Event): void {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const datos = {
      nombre: formData.get('nombre'),
      email: formData.get('email'),
      password: formData.get('password'),
      rol: formData.get('rol')
    };

    const peticion = (this.esEdicion && this.idUsuarioSeleccionado)
      ? this.userService.update(this.idUsuarioSeleccionado, datos)
      : this.userService.create(datos);

    peticion.subscribe({
      next: () => {
        const modalElement = document.getElementById('modalUsuario');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          if (modal) modal.hide();
        }
        const closeBtn = document.getElementById('closeModal');
        if (closeBtn) closeBtn.click();

        this.obtenerUsuarios();
        setTimeout(() => {
          Swal.fire('¡Éxito!', 'Usuario guardado correctamente', 'success');
        }, 200);
      },
      error: (err: any) => {
        setTimeout(() => {
          Swal.fire('Error', err.error?.message || 'No se pudo guardar el usuario', 'error');
        }, 200);
      }
    });
  }

  eliminar(id: number): void {
    Swal.fire({ 
      title: '¿Borrar usuario?', 
      icon: 'warning', 
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        this.userService.delete(id).subscribe({
          next: () => {
            this.obtenerUsuarios();
            setTimeout(() => {
              Swal.fire('Eliminado', 'El usuario ha sido eliminado', 'success');
            }, 100);
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar el usuario', 'error')
        });
      }
    });
  }
}