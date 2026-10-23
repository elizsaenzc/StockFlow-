import { Component }         from '@angular/core';
import { RouterOutlet }      from '@angular/router';
import { SidebarComponent }  from './shared/components/sidebar/sidebar.component';
import { AuthService }       from './core/services/auth.service';
import { CommonModule }      from '@angular/common';

@Component({
  selector:    'sf-root',
  standalone:  true,
  imports:     [CommonModule, RouterOutlet, SidebarComponent],
  template: `
    @if (auth.estaAutenticado()) {
      <div class="app-shell">
        <sf-sidebar />
        <div class="main-area">
          <router-outlet />
        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
