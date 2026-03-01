import {
  Component,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

@Component({
  selector: 'app-keyboard-shortcuts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyboard-shortcuts.component.html',
  styleUrl: './keyboard-shortcuts.component.scss',
})
export class KeyboardShortcutsComponent implements AfterViewInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['T'], description: 'Jump to today' },
        { keys: ['←', '→'], description: 'Scroll timeline left / right' },
        { keys: ['Ctrl', 'scroll'], description: 'Zoom in / out at cursor' },
      ],
    },
    {
      title: 'Zoom Levels',
      shortcuts: [
        { keys: ['1'], description: 'Switch to Day view' },
        { keys: ['2'], description: 'Switch to Week view' },
        { keys: ['3'], description: 'Switch to Month view' },
      ],
    },
    {
      title: 'Actions',
      shortcuts: [
        { keys: ['⌘', 'K'], description: 'Open command palette' },
        { keys: ['?'], description: 'Show keyboard shortcuts' },
        { keys: ['Esc'], description: 'Close panel / overlay' },
      ],
    },
    {
      title: 'Work Orders',
      shortcuts: [
        { keys: ['Click'], description: 'Create work order at position' },
        { keys: ['Drag'], description: 'Draw to create work order' },
        { keys: ['Edge drag'], description: 'Resize work order dates' },
      ],
    },
  ];

  private escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.onClose();
    }
  };

  ngAfterViewInit(): void {
    const overlay = document.querySelector('.shortcuts-overlay');
    const panel = document.querySelector('.shortcuts-panel');
    if (overlay) {
      gsap.from(overlay, { opacity: 0, duration: 0.15, ease: 'power2.out' });
    }
    if (panel) {
      gsap.from(panel, {
        opacity: 0,
        y: 20,
        scale: 0.97,
        duration: 0.25,
        ease: 'power3.out',
      });
    }
    document.addEventListener('keydown', this.escHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.escHandler);
  }

  onClose(): void {
    const panel = document.querySelector('.shortcuts-panel');
    if (panel) {
      gsap.to(panel, {
        opacity: 0,
        y: 10,
        scale: 0.98,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => this.close.emit(),
      });
    } else {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('shortcuts-overlay')) {
      this.onClose();
    }
  }
}
