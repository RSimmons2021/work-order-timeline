import { Component } from '@angular/core';
import { TimelineComponent } from './components/timeline/timeline.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TimelineComponent],
  template: '<app-timeline />',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
