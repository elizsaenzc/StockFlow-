import { Routes }    from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'acceso', title: 'Acceso · StockFlow', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '',            redirectTo: 'panel', pathMatch: 'full' },
      { path: 'panel',       title: 'Panel · StockFlow',       loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'articulos',   title: 'Artículos · StockFlow',   loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent) },
      { path: 'movimientos', title: 'Movimientos · StockFlow', loadComponent: () => import('./features/movements/movements.component').then(m => m.MovementsComponent) },
      { path: 'alertas',     title: 'Alertas · StockFlow',     loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent) },
      { path: 'proveedores', title: 'Proveedores · StockFlow', loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent) },
      { path: 'pedidos',     title: 'Pedidos · StockFlow',     loadComponent: () => import('./features/orders/orders.component').then(m => m.OrdersComponent) },
      { path: 'analiticas',  title: 'Analíticas · StockFlow',  loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
