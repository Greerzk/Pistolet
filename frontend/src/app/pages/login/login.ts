import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import Swal from 'sweetalert2';
import {
  LucideMail,
  LucideLockKeyhole,
  LucideArrowRight,
  LucideShieldCheck,
  LucideEye,
  LucideEyeOff,
  LucideWheat,
  LucideCroissant,
  LucideBadgeCheck,
  LucideHeart
} from '@lucide/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CommonModule,
    LucideMail,
    LucideLockKeyhole,
    LucideArrowRight,
    LucideShieldCheck,
    LucideEye,
    LucideEyeOff,
    LucideWheat,
    LucideCroissant,
    LucideBadgeCheck,
    LucideHeart
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  credenciales = {
    email: '',
    password: ''
  };
  mensajeError = '';
  mostrarPassword = false;

  constructor(private authService: AuthService, private router: Router) {}

  /** Muestra u oculta la contraseña sin perder lo escrito. */
  alternarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  entrar() {
    this.mensajeError = '';

    this.authService.iniciarSesion(this.credenciales).subscribe({
      next: (respuesta: any) => {
        // Guardamos el access token y el refresh token
        localStorage.setItem('token', respuesta.accessToken);
        localStorage.setItem('refreshToken', respuesta.refreshToken);

        // Guardamos los datos del usuario (rol: cliente | empleado | admin)
        const datosUsuario = respuesta.user || respuesta.usuario || {};
        localStorage.setItem('user', JSON.stringify(datosUsuario));

        // El personal va al panel; el cliente a la tienda
        const rol = datosUsuario.rol || 'cliente';
        if (rol === 'admin' || rol === 'empleado') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        const datos = err.error ?? {};
        const mensaje = datos.error || datos.message || 'Error al iniciar sesión';
        this.mensajeError = mensaje;

        // Cuenta eliminada: ofrecemos registrarse de nuevo para reactivarla.
        if (datos.codigo === 'CUENTA_ELIMINADA') {
          Swal.fire({
            icon: 'info',
            title: 'Cuenta eliminada',
            text: mensaje,
            showCancelButton: true,
            confirmButtonText: 'Registrarme de nuevo',
            cancelButtonText: 'Cerrar',
            reverseButtons: true
          }).then((r) => {
            if (r.isConfirmed) this.router.navigate(['/register']);
          });
          return;
        }

        // Sin logs en consola: el aviso se muestra en un modal.
        Swal.fire({
          icon: 'error',
          title: 'No se pudo iniciar sesión',
          text: mensaje,
          confirmButtonText: 'Entendido'
        });
      }
    });
  }
}
