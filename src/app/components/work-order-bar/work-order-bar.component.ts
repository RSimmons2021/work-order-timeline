import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkOrderDocument } from '../../models/work-order.model';

@Component({
  selector: 'app-work-order-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './work-order-bar.component.html',
  styleUrl: './work-order-bar.component.scss',
  host: {
    '[style.top.px]': 'top',
  },
})
// @upgrade: Add drag-to-move (reposition) bars horizontally across the
// timeline. Currently only resize is supported — full drag would allow
// rescheduling by dragging a bar to a new date range or different work center.
export class WorkOrderBarComponent {
  @Input({ required: true }) order!: WorkOrderDocument;
  @Input() left = 0;
  @Input() width = 100;
  @Input() top = 5;

  /** Prevent all clicks/mousedowns on the bar from reaching the timeline row */
  @HostListener('click', ['$event'])
  onHostClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  @HostListener('mousedown', ['$event'])
  onHostMouseDown(event: MouseEvent): void {
    event.stopPropagation();
  }

  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() resizeStart = new EventEmitter<{ side: 'left' | 'right'; event: MouseEvent }>();
  /** Emits viewport position when three-dot button is clicked */
  @Output() menuClick = new EventEmitter<{ x: number; y: number }>();

  showTooltip = false;

  get statusLabel(): string {
    switch (this.order.data.status) {
      case 'open':
        return 'Open';
      case 'in-progress':
        return 'In progress';
      case 'complete':
        return 'Complete';
      case 'blocked':
        return 'Blocked';
      default:
        return '';
    }
  }

  get statusClass(): string {
    return `status-${this.order.data.status}`;
  }

  /** Progress percentage for in-progress bars (0-100) */
  get progressPercent(): number {
    if (this.order.data.status !== 'in-progress') return 0;
    const start = new Date(this.order.data.startDate).getTime();
    const end = new Date(this.order.data.endDate).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  /** Relative time label for tooltip */
  get relativeTimeLabel(): string {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(this.order.data.startDate);
    const end = new Date(this.order.data.endDate);
    const msPerDay = 86400000;

    if (now < start) {
      const days = Math.ceil((start.getTime() - now.getTime()) / msPerDay);
      return `Starts in ${days} day${days !== 1 ? 's' : ''}`;
    } else if (now > end) {
      const days = Math.ceil((now.getTime() - end.getTime()) / msPerDay);
      return `Ended ${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / msPerDay);
      return `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`;
    }
  }

  /** Three-dot menu button clicked — emit viewport position for dropdown */
  onMenuClick(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    this.menuClick.emit({ x: rect.right, y: rect.bottom + 4 });
  }

  /** Start drag-to-resize from left or right edge */
  onResizeHandleDown(event: MouseEvent, side: 'left' | 'right'): void {
    event.stopPropagation();
    event.preventDefault();
    this.resizeStart.emit({ side, event });
  }

  onBarMouseEnter(): void {
    this.showTooltip = true;
  }

  onBarMouseLeave(): void {
    this.showTooltip = false;
  }
}
