import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import Swal from 'sweetalert2';

export const authGuard: CanActivateFn = (route, _state) => {
  const router = inject(Router);
  const userJson = localStorage.getItem('user');

  if (userJson) {
    const user = JSON.parse(userJson);
    const userRole = user.tipo_usuario || user.rol;
    const rolesEsperados = route.data['roles'] as Array<string>;

    if (!rolesEsperados || rolesEsperados.includes(userRole)) {
      return true;
    }

    // Sin logs en consola: el aviso se muestra en un modal y luego redirigimos.
    Swal.fire({
      icon: 'warning',
      title: 'Acceso restringido',
      text: 'No tienes permisos para entrar a esta sección.',
      confirmButtonText: 'Entendido'
    });
    return router.parseUrl('/');
  }

  // Sin sesión: avisamos con un modal antes de mandar al login.
  Swal.fire({
    icon: 'info',
    title: 'Inicia sesión',
    text: 'Debes iniciar sesión para continuar.',
    confirmButtonText: 'Ir a iniciar sesión'
  });
  return router.parseUrl('/login');
};
