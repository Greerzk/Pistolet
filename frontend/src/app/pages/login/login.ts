import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  credenciales = {
    email: '',
    password: ''
  };
  mensajeError = '';

  constructor(private authService: AuthService, private router: Router) {}

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
        this.mensajeError = err.error?.error || err.error?.message || 'Error al iniciar sesión';
      }
    });
  }
}
