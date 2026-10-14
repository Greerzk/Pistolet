import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const userJson = localStorage.getItem('user');

  if (userJson) {
    const user = JSON.parse(userJson);
    const userRole = user.tipo_usuario || user.rol;
    const rolesEsperados = route.data['roles'] as Array<string>;

    if (!rolesEsperados) {
      return true;
    }

    if (rolesEsperados.includes(userRole)) {
      return true;
    } else {
      console.warn('Acceso denegado: Rol insuficiente');
      router.navigate(['/']);
      return false;
    }
  }

  console.warn('No hay sesión: Redirigiendo al login');
  router.navigate(['/login']);
  return false;
};