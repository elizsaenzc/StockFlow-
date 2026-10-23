import { Component }       from '@angular/core';
import { RouterOutlet }    from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';

@Component({
  selector:   'sf-root',
  standalone: true,
  imports:    [RouterOutlet],
  template:   `<router-outlet />`,
})
export class AppComponent {
  constructor(iconos: MatIconRegistry) {
    // Iconos Material Symbols (fuente local del paquete material-symbols)
    iconos.setDefaultFontSetClass('material-symbols-outlined');
  }
}
