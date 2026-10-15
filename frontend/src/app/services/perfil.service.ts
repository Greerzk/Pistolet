// =====================================================================
//  PISTOLET · Servicio de perfil (web)
//  Usa el MISMO backend que la app móvil: /api/me
//
//  El último perfil recibido queda en una señal compartida: así el
//  header (círculo con la foto) y la página de perfil siempre muestran
//  lo mismo y se actualizan solos al cambiar la foto.
// =====================================================================
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PerfilWeb {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  avatar_url: string | null;
  creado_en: string;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private apiUrl = environment.apiUrl;

  private readonly _perfil = signal<PerfilWeb | null>(null);

  /** Último perfil conocido (lo leen el header y la página de perfil). */
  readonly perfil = this._perfil.asReadonly();

  constructor(private http: HttpClient) {}

  obtenerPerfil(): Observable<PerfilWeb> {
    return this.http
      .get<PerfilWeb>(`${this.apiUrl}/me`)
      .pipe(tap((p) => this._perfil.set(p)));
  }

  actualizarPerfil(datos: { nombre: string; email: string; telefono?: string | null }): Observable<PerfilWeb> {
    return this.http
      .put<PerfilWeb>(`${this.apiUrl}/me`, datos)
      .pipe(tap((p) => this._perfil.set(p)));
  }

  cambiarPassword(datos: { password_actual: string; password_nueva: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/me/password`, datos);
  }

  eliminarCuenta(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/me`);
  }

  // Sube (o reemplaza) la foto de perfil. El backend la guarda en Cloudinary.
  // No fijamos Content-Type: el navegador pone el boundary del multipart.
  subirAvatar(archivo: File): Observable<PerfilWeb> {
    const datos = new FormData();
    datos.append('imagen', archivo);
    return this.http
      .post<PerfilWeb>(`${this.apiUrl}/me/avatar`, datos)
      .pipe(tap((p) => this._perfil.set(p)));
  }

  // Quita la foto de perfil (la borra también de Cloudinary).
  eliminarAvatar(): Observable<PerfilWeb> {
    return this.http
      .delete<PerfilWeb>(`${this.apiUrl}/me/avatar`)
      .pipe(tap((p) => this._perfil.set(p)));
  }

  /** Olvida el perfil cacheado (al cerrar sesión). */
  limpiar(): void {
    this._perfil.set(null);
  }
}
