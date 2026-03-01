import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkOrderDocument } from '../../models/work-order.model';
import { WorkCenterDocument } from '../../models/work-center.model';
import gsap from 'gsap';

export interface CommandAction {
  type: 'jump-to-today' | 'jump-to-date' | 'create-order' | 'edit-order' | 'zoom-day' | 'zoom-week' | 'zoom-month' | 'reset-data' | 'show-shortcuts';
  order?: WorkOrderDocument;
  date?: string;
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'navigation' | 'actions' | 'work-orders' | 'zoom';
  action: CommandAction;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
})
export class CommandPaletteComponent implements AfterViewInit, OnDestroy {
  @Input() workOrders: WorkOrderDocument[] = [];
  @Input() workCenters: WorkCenterDocument[] = [];
  @Output() execute = new EventEmitter<CommandAction>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  query = '';
  selectedIndex = 0;

  private keydownHandler = (e: KeyboardEvent) => this.onKeydown(e);

  get filteredCommands(): CommandItem[] {
    const items = this.buildCommandList();
    if (!this.query.trim()) return items;

    const q = this.query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }

  ngAfterViewInit(): void {
    // Animate in
    const overlay = document.querySelector('.palette-overlay');
    const panel = document.querySelector('.palette-panel');
    if (overlay) {
      gsap.from(overlay, { opacity: 0, duration: 0.15, ease: 'power2.out' });
    }
    if (panel) {
      gsap.from(panel, {
        opacity: 0,
        y: -20,
        scale: 0.97,
        duration: 0.2,
        ease: 'power3.out',
      });
    }

    // Focus search input
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 50);

    document.addEventListener('keydown', this.keydownHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.keydownHandler);
  }

  private buildCommandList(): CommandItem[] {
    const commands: CommandItem[] = [
      {
        id: 'nav-today',
        label: 'Jump to Today',
        description: 'Scroll timeline to current date',
        icon: 'calendar',
        category: 'navigation',
        action: { type: 'jump-to-today' },
      },
      {
        id: 'zoom-day',
        label: 'Zoom: Day View',
        description: 'Switch to day-level zoom',
        icon: 'zoom',
        category: 'zoom',
        action: { type: 'zoom-day' },
      },
      {
        id: 'zoom-week',
        label: 'Zoom: Week View',
        description: 'Switch to week-level zoom',
        icon: 'zoom',
        category: 'zoom',
        action: { type: 'zoom-week' },
      },
      {
        id: 'zoom-month',
        label: 'Zoom: Month View',
        description: 'Switch to month-level zoom',
        icon: 'zoom',
        category: 'zoom',
        action: { type: 'zoom-month' },
      },
      {
        id: 'show-shortcuts',
        label: 'Show Keyboard Shortcuts',
        description: 'Display all available shortcuts',
        icon: 'keyboard',
        category: 'actions',
        action: { type: 'show-shortcuts' },
      },
      {
        id: 'reset-data',
        label: 'Reset Sample Data',
        description: 'Restore original work orders',
        icon: 'refresh',
        category: 'actions',
        action: { type: 'reset-data' },
      },
    ];

    // Add work order search results
    for (const order of this.workOrders) {
      const center = this.workCenters.find(
        (c) => c.docId === order.data.workCenterId
      );
      commands.push({
        id: `order-${order.docId}`,
        label: order.data.name,
        description: `${center?.data.name || 'Unknown'} · ${order.data.status}`,
        icon: 'order',
        category: 'work-orders',
        action: { type: 'edit-order', order },
      });
    }

    return commands;
  }

  onQueryChange(): void {
    this.selectedIndex = 0;
  }

  private onKeydown(event: KeyboardEvent): void {
    const items = this.filteredCommands;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
        this.scrollSelectedIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.scrollSelectedIntoView();
        break;
      case 'Enter':
        event.preventDefault();
        if (items[this.selectedIndex]) {
          this.executeCommand(items[this.selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.onClose();
        break;
    }
  }

  private scrollSelectedIntoView(): void {
    requestAnimationFrame(() => {
      const el = document.querySelector('.command-item.selected');
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  executeCommand(item: CommandItem): void {
    this.execute.emit(item.action);
  }

  onClose(): void {
    const panel = document.querySelector('.palette-panel');
    if (panel) {
      gsap.to(panel, {
        opacity: 0,
        y: -10,
        scale: 0.97,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => this.close.emit(),
      });
    } else {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('palette-overlay')) {
      this.onClose();
    }
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'navigation': return 'Navigation';
      case 'actions': return 'Actions';
      case 'work-orders': return 'Work Orders';
      case 'zoom': return 'Zoom';
      default: return category;
    }
  }
}
