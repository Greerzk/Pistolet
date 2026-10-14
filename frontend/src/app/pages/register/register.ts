import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './register.html'
})
export class RegisterComponent {
  usuario = {
    nombre: '',
    email: '',
    password: ''
  };
  mensajeError = '';

  constructor(private authService: AuthService, private router: Router) {}

  registrar() {
    this.mensajeError = '';
    this.authService.registrarUsuario(this.usuario).subscribe({
      next: () => {
        // Mensaje en modal (sin diálogos nativos del navegador).
        Swal.fire({
          icon: 'success',
          title: '¡Bienvenido a la familia Pistolet!',
          text: 'Tu cuenta ha sido creada. Ya puedes iniciar sesión.',
          confirmButtonText: 'Ir a iniciar sesión'
        }).then(() => this.router.navigate(['/login']));
      },
      error: (err) => {
        const mensaje = err.error?.error || 'Hubo un error al registrar. Intenta con otro correo.';
        this.mensajeError = mensaje;
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
