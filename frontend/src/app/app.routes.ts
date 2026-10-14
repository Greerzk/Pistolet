import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';
import { ProductsComponent } from './pages/products/products';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { ProfileComponent } from './pages/profile/profile';
import { ProductDetailComponent } from './pages/product-detail/product-detail';

import { AdminLayoutComponent } from './pages/admin/admin-layout/admin-layout';
import { authGuard } from './guards/auth-guard';
import { AdminDashboardComponent } from './pages/admin/dashboard/dashboard';
import { AdminProductsComponent } from './pages/admin/products/products';
import { AdminUsersComponent } from './pages/admin/users/users';
import { AdminIngredientsComponent } from './pages/admin/ingredients/ingredients';
import { AdminSalesComponent } from './pages/admin/sales/sales'; 

export const routes: Routes = [
  // --- Rutas Públicas ---
  { path: '', component: Home },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: 'products', component: ProductsComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'producto/:id', component: ProductDetailComponent },

  // --- Rutas Privadas (Cualquier usuario logueado) ---
  { 
    path: 'profile', 
    component: ProfileComponent, 
    canActivate: [authGuard], 
    data: { roles: ['cliente', 'empleado', 'admin'] } 
  },

  // --- PANEL ADMINISTRATIVO (Solo Admin y Empleado) ---
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    data: { roles: ['admin', 'empleado'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'productos', component: AdminProductsComponent },
      { path: 'usuarios', component: AdminUsersComponent },
      { path: 'insumos', component: AdminIngredientsComponent },
      { path: 'ventas', component: AdminSalesComponent },
    ]
  },

  // Cualquier ruta no reconocida regresa al inicio
  { path: '**', redirectTo: '' }
];