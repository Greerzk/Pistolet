import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, CommonModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css']
})
export class AdminLayoutComponent implements OnInit {
  usuarioActual: any = null;
  sidebarColapsado = false;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.usuarioActual = JSON.parse(userStr);
      } catch (e) {
        this.usuarioActual = null;
      }
    }
  }

  toggleSidebar(): void {
    this.sidebarColapsado = !this.sidebarColapsado;
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
}
