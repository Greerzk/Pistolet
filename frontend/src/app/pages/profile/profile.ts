import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { PerfilService, PerfilWeb } from '../../services/perfil.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  cargando = true;
  perfil: PerfilWeb | null = null;

  editando = false;
  nombre = '';
  email = '';
  telefono = '';
  guardando = false;

  cambiandoPwd = false;
  pwdActual = '';
  pwdNueva = '';
  pwdConfirma = '';
  guardandoPwd = false;

  eliminando = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private perfilService: PerfilService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const userJson = localStorage.getItem('user');

    if (!token && !refreshToken && !userJson) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargando = true;
    this.perfilService.obtenerPerfil().subscribe({
      next: (p) => {
        this.perfil = p;
        this.nombre = p.nombre;
        this.email = p.email;
        this.telefono = p.telefono ?? '';
        this.cargando = false;
        // La app es zoneless: hay que avisar a Angular del cambio.
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        // status 0 / TimeoutError = la API no respondió (p. ej.
        // reiniciando en Render), no es un problema de sesión.
        const sinRespuesta = err?.status === 0 || err?.name === 'TimeoutError';
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'warning',
          title: sinRespuesta ? 'La API no responde' : 'No se pudo cargar el perfil',
          text: sinRespuesta
            ? 'El servidor tarda en responder. Inténtalo de nuevo en unos segundos.'
            : 'Verifica tu sesión e inténtalo de nuevo.',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  iniciarEdicion(): void {
    if (!this.perfil) return;
    this.editando = true;
    this.nombre = this.perfil.nombre;
    this.email = this.perfil.email;
    this.telefono = this.perfil.telefono ?? '';
  }

  cancelarEdicion(): void {
    this.editando = false;
  }

  guardar(): void {
    if (!this.nombre.trim() || !this.email.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Nombre y correo son obligatorios.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.guardando = true;
    this.perfilService.actualizarPerfil({
      nombre: this.nombre.trim(),
      email: this.email.trim().toLowerCase(),
      telefono: this.telefono.trim() || null
    }).subscribe({
      next: (p) => {
        this.perfil = p;
        this.editando = false;
        this.guardando = false;
        // Actualizamos localStorage.user si existe (opcional, pero coherente)
        const userJson = localStorage.getItem('user');
        if (userJson) {
          try {
            const u = JSON.parse(userJson);
            u.nombre = p.nombre;
            u.email = p.email;
            u.telefono = p.telefono;
            localStorage.setItem('user', JSON.stringify(u));
          } catch {}
        }
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Perfil actualizado',
          text: 'Tu información se guardó correctamente.',
          confirmButtonText: 'Entendido'
        });
      },
      error: (err) => {
        this.guardando = false;
        const msg = err.error?.error ?? 'No se pudo actualizar el perfil.';
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  abrirPwd(): void {
    this.cambiandoPwd = true;
    this.pwdActual = '';
    this.pwdNueva = '';
    this.pwdConfirma = '';
  }

  cancelarPwd(): void {
    this.cambiandoPwd = false;
  }

  guardarPwd(): void {
    if (!this.pwdActual || !this.pwdNueva || !this.pwdConfirma) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Completa todos los campos.',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    if (this.pwdNueva.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Contraseña inválida',
        text: 'La nueva contraseña debe tener al menos 6 caracteres.',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    if (this.pwdNueva !== this.pwdConfirma) {
      Swal.fire({
        icon: 'warning',
        title: 'No coinciden',
        text: 'La nueva contraseña y la confirmación no coinciden.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.guardandoPwd = true;
    this.perfilService.cambiarPassword({
      password_actual: this.pwdActual,
      password_nueva: this.pwdNueva
    }).subscribe({
      next: () => {
        this.guardandoPwd = false;
        this.cambiandoPwd = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Contraseña actualizada',
          text: 'Tu contraseña se cambió correctamente.',
          confirmButtonText: 'Entendido'
        });
      },
      error: (err) => {
        this.guardandoPwd = false;
        const msg = err.error?.error ?? 'No se pudo cambiar la contraseña.';
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  eliminarCuenta(): void {
    // Modal de confirmación: la eliminación es permanente.
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar cuenta',
      text: 'Esta acción es permanente: se eliminará tu cuenta y ya no podrás iniciar sesión con ella. ¿Deseas continuar?',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B71C1C',
      cancelButtonColor: '#8D6E63',
      reverseButtons: true
    }).then((r) => {
      if (!r.isConfirmed) return;

      this.eliminando = true;
      this.cdr.detectChanges();
      this.perfilService.eliminarCuenta().subscribe({
        next: () => {
          this.eliminando = false;
          Swal.fire({
            icon: 'success',
            title: 'Cuenta eliminada',
            text: 'Tu cuenta se eliminó correctamente. ¡Gracias por tu preferencia!',
            confirmButtonText: 'Entendido'
          }).then(() => this.limpiar());
        },
        error: (err) => {
          this.eliminando = false;
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.error ?? 'No se pudo eliminar la cuenta.',
            confirmButtonText: 'Entendido'
          });
        }
      });
    });
  }

  cerrarSesion(): void {
    const refreshToken = localStorage.getItem('refreshToken');
    this.authService.cerrarSesion(refreshToken).subscribe({
      next: () => this.limpiar(),
      error: () => this.limpiar()
    });
  }

  private limpiar(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  formatearFecha(f: string): string {
    const d = new Date(f);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  etiquetaRol(r: string): string {
    if (r === 'cliente') return 'Cliente';
    if (r === 'empleado') return 'Empleado';
    if (r === 'admin') return 'Administrador';
    return r;
  }

  iniciales(n: string): string {
    return (n ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || 'MI';
  }
}
