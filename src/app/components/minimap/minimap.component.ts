import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  AfterViewInit,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkOrderDocument } from '../../models/work-order.model';
import { WorkCenterDocument } from '../../models/work-center.model';

interface MinimapBar {
  left: number; // percentage
  width: number; // percentage
  top: number; // row index
  color: string;
}

@Component({
  selector: 'app-minimap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minimap.component.html',
  styleUrl: './minimap.component.scss',
})
export class MinimapComponent implements AfterViewInit, OnChanges {
  @Input() workOrders: WorkOrderDocument[] = [];
  @Input() workCenters: WorkCenterDocument[] = [];
  @Input() timelineStartDate!: Date;
  @Input() timelineEndDate!: Date;
  @Input() viewportLeftPercent = 0;
  @Input() viewportWidthPercent = 20;

  @Output() viewportDrag = new EventEmitter<number>(); // emits target center percent

  bars: MinimapBar[] = [];
  isDragging = false;
  private dragStartX = 0;
  private dragStartPercent = 0;

  private statusColors: Record<string, string> = {
    'open': '#d4d7ff',
    'in-progress': '#d6d8ff',
    'complete': '#d1fab3',
    'blocked': '#fceeb5',
  };

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    this.buildBars();
  }

  ngOnChanges(): void {
    this.buildBars();
  }

  private buildBars(): void {
    if (!this.timelineStartDate || !this.timelineEndDate) {
      this.bars = [];
      return;
    }

    const totalMs = this.timelineEndDate.getTime() - this.timelineStartDate.getTime();
    if (totalMs <= 0) {
      this.bars = [];
      return;
    }

    const centerIndexMap = new Map<string, number>();
    this.workCenters.forEach((c, i) => centerIndexMap.set(c.docId, i));

    this.bars = this.workOrders.map((order) => {
      const startMs = new Date(order.data.startDate).getTime() - this.timelineStartDate.getTime();
      const endMs = new Date(order.data.endDate).getTime() - this.timelineStartDate.getTime();
      const leftPercent = Math.max(0, (startMs / totalMs) * 100);
      const widthPercent = Math.max(0.5, ((endMs - startMs) / totalMs) * 100);
      const rowIndex = centerIndexMap.get(order.data.workCenterId) ?? 0;

      return {
        left: leftPercent,
        width: widthPercent,
        top: rowIndex,
        color: this.statusColors[order.data.status] || '#d4d7ff',
      };
    });
  }

  onMinimapClick(event: MouseEvent): void {
    const rect = this.elementRef.nativeElement.querySelector('.minimap-track').getBoundingClientRect();
    const clickPercent = ((event.clientX - rect.left) / rect.width) * 100;
    this.viewportDrag.emit(clickPercent);
  }

  onViewportMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartPercent = this.viewportLeftPercent;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      const rect = this.elementRef.nativeElement.querySelector('.minimap-track').getBoundingClientRect();
      const deltaPx = e.clientX - this.dragStartX;
      const deltaPercent = (deltaPx / rect.width) * 100;
      const newCenter = this.dragStartPercent + this.viewportWidthPercent / 2 + deltaPercent;
      this.viewportDrag.emit(Math.max(0, Math.min(100, newCenter)));
    };

    const onMouseUp = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  get totalRows(): number {
    return this.workCenters.length;
  }
}
