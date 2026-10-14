import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';
import Swal from 'sweetalert2';

bootstrapApplication(AppComponent, appConfig).catch(() => {
  // Sin logs en consola: si la app no arranca, se avisa con un modal.
  Swal.fire({
    icon: 'error',
    title: 'No se pudo iniciar la aplicación',
    text: 'Recarga la página o inténtalo de nuevo en unos momentos.',
    confirmButtonText: 'Recargar'
  }).then((resultado) => {
    if (resultado.isConfirmed) location.reload();
  });
});
