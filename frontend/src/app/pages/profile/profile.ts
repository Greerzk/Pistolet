import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  usuario: any = null;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    const userJson = localStorage.getItem('user');

    if (!userJson) {
      this.router.navigate(['/login']);
      return;
    }

    this.usuario = JSON.parse(userJson);
  }

  cerrarSesion(): void {
    const refreshToken = localStorage.getItem('refreshToken');
    // Revoca la sesión en el backend y limpia el almacenamiento local
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
}
