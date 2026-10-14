// =====================================================================
//  PISTOLET · Interceptor de autenticación
//
//  · Agrega el access token (Bearer) a cada petición.
//  · Si el backend responde 401, intenta renovar el access token con el
//    refresh token (POST /api/auth/refresh) y reintenta la petición.
//  · Si no se puede renovar, cierra la sesión y manda al login.
// =====================================================================
import { HttpErrorResponse, HttpInterceptorFn, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

function limpiarSesion(router: Router): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  router.navigate(['/login']);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);
  const router = inject(Router);

  // Rutas que no deben llevar token ni disparar renovación
  const esRutaLibre =
    req.url.includes('/login') ||
    req.url.includes('/register') ||
    req.url.includes('/auth/refresh');

  const token = localStorage.getItem('token');

  const peticion = (!esRutaLibre && token)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((err: HttpErrorResponse) => {
      // Solo intentamos renovar si fue 401, la ruta no es libre y hay refresh
      const refreshToken = localStorage.getItem('refreshToken');

      if (err.status !== 401 || esRutaLibre || !refreshToken) {
        if (err.status === 401 && !esRutaLibre) limpiarSesion(router);
        return throwError(() => err);
      }

      return http.post<any>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
        switchMap((res) => {
          localStorage.setItem('token', res.accessToken);
          const reintento = req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } });
          return next(reintento);
        }),
        catchError((errorRenovacion) => {
          limpiarSesion(router);
          return throwError(() => errorRenovacion);
        })
      );
    })
  );
};
