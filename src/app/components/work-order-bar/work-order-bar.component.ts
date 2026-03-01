import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkOrderDocument } from '../../models/work-order.model';
import gsap from 'gsap';

@Component({
  selector: 'app-work-order-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './work-order-bar.component.html',
  styleUrl: './work-order-bar.component.scss',
})
export class WorkOrderBarComponent implements AfterViewInit {
  @Input({ required: true }) order!: WorkOrderDocument;
  @Input() left = 0;
  @Input() width = 100;

  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() resizeStart = new EventEmitter<{ side: 'left' | 'right'; event: MouseEvent }>();

  menuOpen = false;
  showTooltip = false;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    const bar = this.elementRef.nativeElement.querySelector('.work-order-bar');
    if (bar) {
      gsap.from(bar, {
        opacity: 0,
        scaleX: 0.85,
        duration: 0.45,
        ease: 'power3.out',
        clearProps: 'all',
      });
    }
  }

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

  get tooltipText(): string {
    return `${this.order.data.name}\n${this.statusLabel}\n${this.order.data.startDate} → ${this.order.data.endDate}`;
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

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  onEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen = false;
    this.edit.emit();
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen = false;

    const bar = this.elementRef.nativeElement.querySelector('.work-order-bar');
    gsap.to(bar, {
      opacity: 0,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => this.delete.emit(),
    });
  }

  /** Start drag-to-resize from left or right edge */
  onResizeHandleDown(event: MouseEvent, side: 'left' | 'right'): void {
    event.stopPropagation();
    event.preventDefault();
    this.resizeStart.emit({ side, event });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.menuOpen = false;
    }
  }

  onBarMouseEnter(): void {
    this.showTooltip = true;
  }

  onBarMouseLeave(): void {
    this.showTooltip = false;
  }
}
