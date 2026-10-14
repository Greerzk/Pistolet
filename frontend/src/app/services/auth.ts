// =====================================================================
//  PISTOLET · Servicio de autenticación
//  Usa el backend unificado (Render + Neon), el MISMO que la app móvil.
// =====================================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Registro público de clientes
  registrarUsuario(usuario: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, usuario);
  }

  // Inicio de sesión -> { accessToken, refreshToken, user }
  iniciarSesion(credenciales: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credenciales);
  }

  // Renueva el access token a partir del refresh token
  refrescar(refreshToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/refresh`, { refreshToken });
  }

  // Revoca la sesión (refresh token) en el backend
  cerrarSesion(refreshToken: string | null): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout`, { refreshToken });
  }
}
