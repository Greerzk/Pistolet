import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideMapPin, LucidePhone } from '@lucide/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, LucideMapPin, LucidePhone],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  title = 'pistolet-frontend2';

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
