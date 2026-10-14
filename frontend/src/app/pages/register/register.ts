import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

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
        alert('¡Bienvenido a la familia Pistolet! Tu cuenta ha sido creada.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error al registrar:', err);
        this.mensajeError = err.error?.error || 'Hubo un error al registrar. Intenta con otro correo.';
      }
    });
  }
}
