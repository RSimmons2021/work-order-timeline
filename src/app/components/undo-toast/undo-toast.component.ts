import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'app-undo-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './undo-toast.component.html',
  styleUrl: './undo-toast.component.scss',
})
export class UndoToastComponent implements AfterViewInit, OnDestroy {
  @Input() message = 'Work order deleted';
  @Input() duration = 5000; // Auto-dismiss after 5 seconds

  @Output() undo = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  progress = 100;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private isPaused = false;
  private remainingTime = 0;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    const toast = this.elementRef.nativeElement.querySelector('.undo-toast');
    if (toast) {
      gsap.from(toast, {
        y: 40,
        opacity: 0,
        duration: 0.35,
        ease: 'power3.out',
      });
    }
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private startCountdown(): void {
    this.startTime = Date.now();
    this.remainingTime = this.duration;
    this.timer = setInterval(() => {
      if (this.isPaused) return;
      const elapsed = Date.now() - this.startTime;
      this.progress = Math.max(0, ((this.remainingTime - elapsed) / this.duration) * 100);
      if (elapsed >= this.remainingTime) {
        this.dismiss();
      }
    }, 30);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  onUndo(): void {
    this.clearTimer();
    const toast = this.elementRef.nativeElement.querySelector('.undo-toast');
    gsap.to(toast, {
      y: -20,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => this.undo.emit(),
    });
  }

  private dismiss(): void {
    this.clearTimer();
    const toast = this.elementRef.nativeElement.querySelector('.undo-toast');
    if (toast) {
      gsap.to(toast, {
        y: 40,
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => this.dismissed.emit(),
      });
    } else {
      this.dismissed.emit();
    }
  }

  onMouseEnter(): void {
    this.isPaused = true;
  }

  onMouseLeave(): void {
    this.isPaused = false;
    // Reset countdown from remaining time
    const elapsed = Date.now() - this.startTime;
    this.remainingTime = Math.max(0, this.remainingTime - elapsed);
    this.startTime = Date.now();
  }
}
