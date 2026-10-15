import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { LucideMapPin, LucidePhone } from '@lucide/angular';
import { PerfilService } from './services/perfil.service';

type UsuarioSesion = { id?: number; nombre?: string; rol?: string };

/** Lee el usuario guardado por el login (cliente | empleado | admin). */
function leerUsuario(): UsuarioSesion | null {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;
  try {
    const user = JSON.parse(userJson);
    return { ...user, rol: user.tipo_usuario || user.rol };
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, LucideMapPin, LucidePhone],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit {
  title = 'pistolet-frontend2';

  private readonly router = inject(Router);
  private readonly perfilService = inject(PerfilService);

  /** Usuario guardado por el login (se relee en cada navegación). */
  readonly usuario = signal<UsuarioSesion | null>(leerUsuario());

  /** Perfil completo (incluye avatar_url); lo comparte con la página de perfil. */
  readonly perfil = this.perfilService.perfil;

  get estaLogueado(): boolean {
    return this.usuario() !== null;
  }

  /** Iniciales para el avatar cuando todavía no hay foto. */
  get iniciales(): string {
    const nombre = this.perfil()?.nombre ?? this.usuario()?.nombre ?? '';
    return (
      nombre
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join('') || 'MI'
    );
  }

  ngOnInit(): void {
    // El header es la raíz de la app: se mantiene montado antes y después
    // del login, así que releemos la sesión en cada navegación.
    this.router.events
      .pipe(filter((evento) => evento instanceof NavigationEnd))
      .subscribe(() => this.sincronizarSesion());

    this.sincronizarSesion();
  }

  /** Refresca el usuario y, si hace falta, su foto de perfil. */
  private sincronizarSesion(): void {
    const usuario = leerUsuario();
    this.usuario.set(usuario);

    if (!usuario) {
      this.perfilService.limpiar();
      return;
    }

    // Solo pedimos /me si no tenemos el perfil de ESTE usuario.
    const actual = this.perfil();
    if (!actual || actual.id !== usuario.id) {
      this.perfilService.obtenerPerfil().subscribe({ error: () => {} });
    }
  }
}
