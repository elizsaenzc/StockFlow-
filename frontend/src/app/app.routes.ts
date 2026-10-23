import { Routes }    from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'acceso',    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '',           redirectTo: 'panel', pathMatch: 'full' },
      { path: 'panel',      loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'articulos',  loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent) },
      { path: 'movimientos',loadComponent: () => import('./features/movements/movements.component').then(m => m.MovementsComponent) },
      { path: 'alertas',    loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent) },
      { path: 'proveedores',loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent) },
      { path: 'pedidos',    loadComponent: () => import('./features/orders/orders.component').then(m => m.OrdersComponent) },
      { path: 'analiticas', loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
