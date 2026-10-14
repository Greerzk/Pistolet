// =====================================================================
//  PISTOLET · Servicio de perfil (web)
//  Usa el MISMO backend que la app móvil: /api/me
// =====================================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  constructor(private http: HttpClient) {}

  obtenerPerfil(): Observable<PerfilWeb> {
    return this.http.get<PerfilWeb>(`${this.apiUrl}/me`);
  }

  actualizarPerfil(datos: { nombre: string; email: string; telefono?: string | null }): Observable<PerfilWeb> {
    return this.http.put<PerfilWeb>(`${this.apiUrl}/me`, datos);
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
    return this.http.post<PerfilWeb>(`${this.apiUrl}/me/avatar`, datos);
  }

  // Quita la foto de perfil (la borra también de Cloudinary).
  eliminarAvatar(): Observable<PerfilWeb> {
    return this.http.delete<PerfilWeb>(`${this.apiUrl}/me/avatar`);
  }
}
