import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import Swal from 'sweetalert2';
import {
  LucideMail,
  LucideLockKeyhole,
  LucideUserRound,
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
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CommonModule,
    LucideMail,
    LucideLockKeyhole,
    LucideUserRound,
    LucideArrowRight,
    LucideShieldCheck,
    LucideEye,
    LucideEyeOff,
    LucideWheat,
    LucideCroissant,
    LucideBadgeCheck,
    LucideHeart
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  usuario = {
    nombre: '',
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

  registrar() {
    this.mensajeError = '';
    this.authService.registrarUsuario(this.usuario).subscribe({
      next: (respuesta: any) => {
        const reactivado = Boolean(respuesta?.reactivado);
        // Mensaje en modal (sin diálogos nativos del navegador).
        Swal.fire({
          icon: 'success',
          title: reactivado ? '¡Te extrañamos!' : '¡Bienvenido a la familia Pistolet!',
          text: reactivado
            ? 'Tu cuenta fue reactivada. Ya puedes iniciar sesión.'
            : 'Tu cuenta ha sido creada. Ya puedes iniciar sesión.',
          confirmButtonText: 'Ir a iniciar sesión'
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: (err) => {
        const datos = err.error ?? {};
        const mensaje = datos.error || datos.message || 'Error al registrar el usuario';
        this.mensajeError = mensaje;

        // Sin logs en consola: el aviso se muestra en un modal.
        Swal.fire({
          icon: 'error',
          title: 'No se pudo crear la cuenta',
          text: mensaje,
          confirmButtonText: 'Entendido'
        });
      }
    });
  }
}
