import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  title = 'pistolet-frontend2';

  /** Tema activo: 'dark' (por defecto) o 'light'. */
  tema: 'light' | 'dark' = 'dark';

  constructor() {
    if (typeof document !== 'undefined') {
      const actual = document.documentElement.getAttribute('data-bs-theme');
      this.tema = actual === 'light' ? 'light' : 'dark';
    }
  }

  /** Alterna el tema claro/oscuro y lo persiste en localStorage. */
  alternarTema(): void {
    if (typeof document === 'undefined') return;
    this.tema = this.tema === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', this.tema);
    try {
      localStorage.setItem('pistolet-theme', this.tema);
    } catch {
      // localStorage no disponible: el tema cambia solo en esta sesión.
    }
  }

  get estaLogueado(): boolean {
    return typeof window !== 'undefined' && localStorage.getItem('user') !== null;
  }

  get usuario() {
    if (typeof window !== 'undefined') {
      const userJson = localStorage.getItem('user');
      if (!userJson) return null;
      
      try {
        const user = JSON.parse(userJson);
        return {
          ...user,
          rol: user.tipo_usuario || user.rol
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}