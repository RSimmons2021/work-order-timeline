import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { WorkOrderService, UndoAction } from '../../services/work-order.service';
import { WorkCenterDocument } from '../../models/work-center.model';
import { WorkOrderDocument } from '../../models/work-order.model';
import { WorkOrderBarComponent } from '../work-order-bar/work-order-bar.component';
import { WorkOrderPanelComponent } from '../work-order-panel/work-order-panel.component';
import { UndoToastComponent } from '../undo-toast/undo-toast.component';
import { CommandPaletteComponent, CommandAction } from '../command-palette/command-palette.component';
import { KeyboardShortcutsComponent } from '../keyboard-shortcuts/keyboard-shortcuts.component';
import { MinimapComponent } from '../minimap/minimap.component';
import gsap from 'gsap';

export type ZoomLevel = 'day' | 'week' | 'month';

interface TimelineColumn {
  label: string;
  date: Date;
  isToday: boolean;
  isCurrentPeriod: boolean;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule,
    WorkOrderBarComponent,
    WorkOrderPanelComponent,
    UndoToastComponent,
    CommandPaletteComponent,
    KeyboardShortcutsComponent,
    MinimapComponent,
  ],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
})
export class TimelineComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('timelineGrid') timelineGrid!: ElementRef<HTMLDivElement>;
  @ViewChild('timelineHeader') timelineHeader!: ElementRef<HTMLDivElement>;
  @ViewChild('todayIndicator') todayIndicator!: ElementRef<HTMLDivElement>;

  workCenters: WorkCenterDocument[] = [];
  workOrders: WorkOrderDocument[] = [];

  zoomLevel: ZoomLevel = 'week';
  zoomOptions = [
    { label: 'Day', value: 'day' as ZoomLevel },
    { label: 'Week', value: 'week' as ZoomLevel },
    { label: 'Month', value: 'month' as ZoomLevel },
  ];

  columns: TimelineColumn[] = [];
  columnWidth = 90;

  // Panel state
  panelOpen = false;
  panelMode: 'create' | 'edit' = 'create';
  panelWorkCenterId = '';
  panelStartDate = '';
  editingOrder: WorkOrderDocument | null = null;

  // Hover state
  hoveredRowId: string | null = null;

  // Today indicator position
  todayPosition = 0;
  todayLabel = '';

  // Track timeline range
  timelineStartDate!: Date;
  timelineEndDate!: Date;

  // Zoom dropdown (ng-select bound value)
  zoomDropdownOpen = false;

  // Undo toast state
  undoAction: UndoAction | null = null;
  undoToastVisible = false;
  undoToastMessage = '';

  // Command palette state
  commandPaletteOpen = false;

  // Keyboard shortcuts overlay state
  shortcutsOverlayOpen = false;

  // Drag-to-create state
  dragCreating = false;
  dragCreateCenterId = '';
  dragCreateStartX = 0;
  dragCreateCurrentX = 0;
  dragCreateStartDate = '';
  dragCreateEndDate = '';

  // Drag-to-resize state
  resizing = false;
  resizeSide: 'left' | 'right' = 'left';
  resizeOrder: WorkOrderDocument | null = null;
  resizeStartX = 0;
  resizeOriginalLeft = 0;
  resizeOriginalWidth = 0;

  // Minimap state
  minimapViewportLeft = 0;
  minimapViewportWidth = 20;

  // Three-dot context menu state
  menuOpen = false;
  menuOrder: WorkOrderDocument | null = null;
  menuX = 0;
  menuY = 0;

  // Delete confirmation dialog state
  deleteConfirmOpen = false;
  deleteConfirmOrder: WorkOrderDocument | null = null;

  // Infinite scroll state
  private infiniteScrollLocked = false;
  private readonly SCROLL_EDGE_THRESHOLD = 200; // px from edge to trigger
  private readonly COLUMNS_PER_BATCH = 10; // columns to add per batch

  // Contextual cursor state
  cursorStyle = 'default';

  constructor(
    public workOrderService: WorkOrderService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.generateColumns();
    this.calculateTodayPosition();
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.scrollToToday(false);
      this.animateInitialLoad();
      this.updateMinimapViewport();
      // Trigger infinite scroll check after initial layout
      this.checkInfiniteScroll();
    });
  }

  ngOnDestroy(): void {}

  private loadData(): void {
    this.workCenters = this.workOrderService.workCenters();
    this.workOrders = this.workOrderService.workOrders();
  }

  refreshData(): void {
    this.workCenters = this.workOrderService.workCenters();
    this.workOrders = this.workOrderService.workOrders();
  }

  generateColumns(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.columns = [];

    switch (this.zoomLevel) {
      case 'day':
        this.columnWidth = 60;
        for (let i = -45; i <= 45; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() + i);
          this.columns.push({
            label: this.formatDayLabel(d),
            date: new Date(d),
            isToday: i === 0,
            isCurrentPeriod: i === 0,
          });
        }
        break;

      case 'week':
        this.columnWidth = 90;
        const weekStart = this.getWeekStart(today);
        for (let i = -12; i <= 12; i++) {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i * 7);
          const isCurrentWeek =
            today >= d && today < new Date(d.getTime() + 7 * 86400000);
          this.columns.push({
            label: this.formatWeekLabel(d),
            date: new Date(d),
            isToday: false,
            isCurrentPeriod: isCurrentWeek,
          });
        }
        break;

      case 'month':
        this.columnWidth = 114;
        for (let i = -12; i <= 12; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
          const isCurrentMonth =
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth();
          this.columns.push({
            label: this.formatMonthLabel(d),
            date: new Date(d),
            isToday: false,
            isCurrentPeriod: isCurrentMonth,
          });
        }
        break;
    }

    if (this.columns.length > 0) {
      this.timelineStartDate = this.columns[0].date;
      const lastCol = this.columns[this.columns.length - 1];
      this.timelineEndDate = this.getColumnEndDate(lastCol.date);
    }

    this.calculateTodayPosition();
  }

  private getColumnEndDate(startDate: Date): Date {
    const d = new Date(startDate);
    switch (this.zoomLevel) {
      case 'day':
        d.setDate(d.getDate() + 1);
        break;
      case 'week':
        d.setDate(d.getDate() + 7);
        break;
      case 'month':
        d.setMonth(d.getMonth() + 1);
        break;
    }
    return d;
  }

  calculateTodayPosition(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.todayPosition = this.dateToPixelPosition(today);

    switch (this.zoomLevel) {
      case 'day':
        this.todayLabel = 'Today';
        break;
      case 'week':
        this.todayLabel = 'Current week';
        break;
      case 'month':
        this.todayLabel = 'Current month';
        break;
    }
  }

  // @upgrade: Replace linear date-to-pixel mapping with virtual scrolling for
  // large date ranges. Current approach generates all columns upfront which
  // limits performance past ~200 columns. A virtualized renderer would only
  // create DOM nodes for visible columns.
  dateToPixelPosition(date: Date): number {
    if (!this.timelineStartDate) return 0;
    const totalMs = this.timelineEndDate.getTime() - this.timelineStartDate.getTime();
    const dateMs = date.getTime() - this.timelineStartDate.getTime();
    const totalWidth = this.columns.length * this.columnWidth;
    return (dateMs / totalMs) * totalWidth;
  }

  pixelPositionToDate(px: number): Date {
    const totalWidth = this.columns.length * this.columnWidth;
    const totalMs = this.timelineEndDate.getTime() - this.timelineStartDate.getTime();
    const dateMs = (px / totalWidth) * totalMs;
    const date = new Date(this.timelineStartDate.getTime() + dateMs);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  getBarStyle(order: WorkOrderDocument): { left: number; width: number } {
    const start = new Date(order.data.startDate);
    const end = new Date(order.data.endDate);
    const left = this.dateToPixelPosition(start);
    const right = this.dateToPixelPosition(end);
    return { left, width: Math.max(right - left, 20) };
  }

  // @upgrade: Memoize this with a Map<centerId, WorkOrderDocument[]> that
  // invalidates on workOrders change, to avoid re-filtering on every render cycle.
  getOrdersForCenter(centerId: string): WorkOrderDocument[] {
    return this.workOrders.filter((wo) => wo.data.workCenterId === centerId);
  }

  /** Height of a row based on how many orders it contains (bar height = 38px + 5px gaps) */
  getRowHeight(centerId: string): number {
    const count = this.getOrdersForCenter(centerId).length;
    return Math.max(48, count * 43 + 5); // 43 = 38px bar + 5px gap, minimum 48px
  }

  /** Top offset (px) for a row based on cumulative heights of preceding rows */
  getRowTop(centerIndex: number): number {
    let top = 0;
    for (let i = 0; i < centerIndex; i++) {
      top += this.getRowHeight(this.workCenters[i].docId);
    }
    return top;
  }

  /** Top offset for a bar within its row, based on its index */
  getBarTop(centerId: string, orderIndex: number): number {
    return orderIndex * 43 + 5; // 43 = 38px bar height + 5px gap
  }

  /** Total height of all rows combined */
  get totalRowsHeight(): number {
    return this.workCenters.reduce((sum, c) => sum + this.getRowHeight(c.docId), 0);
  }

  // =========================================================================
  // Zoom Controls (with animated transitions)
  // =========================================================================

  /** Called by ng-select (ngModelChange) — receives the bindValue string */
  onZoomSelectChange(value: ZoomLevel): void {
    if (value) {
      this.onZoomChange(value);
    }
  }

  onZoomChange(level: ZoomLevel): void {
    if (level === this.zoomLevel) return;

    const scrollBefore = this.timelineGrid?.nativeElement.scrollLeft || 0;
    const containerWidth = this.timelineGrid?.nativeElement.clientWidth || 800;
    const centerPx = scrollBefore + containerWidth / 2;
    const centerDate = this.pixelPositionToDate(centerPx);

    // Lock infinite scroll during the entire zoom transition to prevent
    // prepend/append from corrupting column state mid-animation
    this.infiniteScrollLocked = true;

    this.zoomLevel = level;
    this.zoomDropdownOpen = false;
    this.generateColumns();

    // Force DOM update before reading pixel positions so columns are rendered
    this.cdr.detectChanges();

    // Animate zoom transition
    requestAnimationFrame(() => {
      const newCenterPx = this.dateToPixelPosition(centerDate);
      const targetScroll = Math.max(0, newCenterPx - containerWidth / 2);

      // Set scroll position immediately first so bars render in correct place
      this.timelineGrid.nativeElement.scrollLeft = targetScroll;

      // GSAP animated zoom transition
      const gridLines = this.timelineGrid?.nativeElement.querySelectorAll('.grid-line');
      const headerCols = document.querySelectorAll('.header-col');

      if (gridLines) {
        gsap.from(gridLines, {
          opacity: 0,
          duration: 0.3,
          stagger: 0.01,
          ease: 'power3.out',
        });
      }

      if (headerCols.length > 0) {
        gsap.from(headerCols, {
          opacity: 0,
          y: -4,
          duration: 0.3,
          stagger: 0.01,
          ease: 'power3.out',
        });
      }

      // Animate work order bars (do NOT use clearProps: 'all' — it strips
      // Angular's host element bindings like [style.top.px] and [style.left.px])
      const bars = this.timelineGrid.nativeElement.querySelectorAll('app-work-order-bar');
      gsap.from(bars, {
        opacity: 0,
        scaleX: 0.85,
        duration: 0.35,
        stagger: 0.02,
        ease: 'power3.out',
        clearProps: 'opacity,scaleX',
      });

      // Unlock infinite scroll after animations settle
      setTimeout(() => {
        this.infiniteScrollLocked = false;
        this.checkInfiniteScroll();
        this.updateMinimapViewport();
      }, 450);

      this.updateMinimapViewport();
    });
  }

  scrollToToday(animate = true): void {
    if (!this.timelineGrid) return;
    const container = this.timelineGrid.nativeElement;
    const targetScroll = Math.max(0, this.todayPosition - container.clientWidth / 2);

    if (animate) {
      this.infiniteScrollLocked = true;
      gsap.to(container, {
        scrollLeft: targetScroll,
        duration: 0.5,
        ease: 'power3.out',
        onComplete: () => {
          this.infiniteScrollLocked = false;
          this.checkInfiniteScroll();
        },
      });
    } else {
      container.scrollLeft = targetScroll;
    }
  }

  // =========================================================================
  // Click-to-Create
  // =========================================================================

  onTimelineClick(event: MouseEvent, workCenterId: string): void {
    if (this.dragCreating || this.resizing) return;

    const target = event.target as HTMLElement;
    if (target.closest('.work-order-bar')) return;
    if (target.closest('.resize-handle')) return;

    const gridRect = this.timelineGrid.nativeElement.getBoundingClientRect();
    const scrollLeft = this.timelineGrid.nativeElement.scrollLeft;
    const clickX = event.clientX - gridRect.left + scrollLeft;

    const clickDate = this.pixelPositionToDate(clickX);
    const startDate = clickDate.toISOString().split('T')[0];

    this.panelMode = 'create';
    this.panelWorkCenterId = workCenterId;
    this.panelStartDate = startDate;
    this.editingOrder = null;
    this.openPanel();
  }

  // =========================================================================
  // Drag-to-Create
  // =========================================================================

  onTimelineMouseDown(event: MouseEvent, workCenterId: string): void {
    const target = event.target as HTMLElement;
    if (target.closest('.work-order-bar')) return;
    if (target.closest('.resize-handle')) return;
    if (event.button !== 0) return;

    const gridRect = this.timelineGrid.nativeElement.getBoundingClientRect();
    const scrollLeft = this.timelineGrid.nativeElement.scrollLeft;
    const startX = event.clientX - gridRect.left + scrollLeft;

    this.dragCreateStartX = startX;
    this.dragCreateCurrentX = startX;
    this.dragCreateCenterId = workCenterId;

    const startDate = this.pixelPositionToDate(startX);
    this.dragCreateStartDate = startDate.toISOString().split('T')[0];
    this.dragCreateEndDate = this.dragCreateStartDate;

    const threshold = 10;

    const onMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX - gridRect.left + this.timelineGrid.nativeElement.scrollLeft;
      if (!this.dragCreating && Math.abs(currentX - this.dragCreateStartX) > threshold) {
        this.dragCreating = true;
      }
      if (this.dragCreating) {
        this.dragCreateCurrentX = currentX;
        const endDate = this.pixelPositionToDate(Math.max(currentX, this.dragCreateStartX));
        const actualStartDate = this.pixelPositionToDate(Math.min(currentX, this.dragCreateStartX));
        this.dragCreateStartDate = actualStartDate.toISOString().split('T')[0];
        this.dragCreateEndDate = endDate.toISOString().split('T')[0];
        this.cdr.detectChanges();
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (this.dragCreating) {
        this.panelMode = 'create';
        this.panelWorkCenterId = this.dragCreateCenterId;
        this.panelStartDate = this.dragCreateStartDate;
        this.editingOrder = null;
        this.openPanel();
      }

      this.cdr.detectChanges();
      setTimeout(() => {
        this.dragCreating = false;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  get dragCreateLeft(): number {
    return Math.min(this.dragCreateStartX, this.dragCreateCurrentX);
  }

  get dragCreateWidth(): number {
    return Math.abs(this.dragCreateCurrentX - this.dragCreateStartX);
  }

  getDragCreateTop(centerId: string): number {
    const index = this.workCenters.findIndex((c) => c.docId === centerId);
    return this.getRowTop(index) + 5;
  }

  // =========================================================================
  // Drag-to-Resize Bars
  // @upgrade: Add snap-to-grid behavior so bars align to column boundaries
  // when resizing. Also add overlap validation during resize (live feedback)
  // instead of only validating on drop.
  // =========================================================================

  onBarResizeStart(order: WorkOrderDocument, event: { side: 'left' | 'right'; event: MouseEvent }): void {
    event.event.stopPropagation();
    event.event.preventDefault();

    this.resizing = true;
    this.resizeSide = event.side;
    this.resizeOrder = order;
    this.resizeStartX = event.event.clientX;

    const barStyle = this.getBarStyle(order);
    this.resizeOriginalLeft = barStyle.left;
    this.resizeOriginalWidth = barStyle.width;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.resizing || !this.resizeOrder) return;
      const deltaX = e.clientX - this.resizeStartX;

      if (this.resizeSide === 'left') {
        const newLeft = this.resizeOriginalLeft + deltaX;
        const newDate = this.pixelPositionToDate(newLeft);
        const newDateIso = newDate.toISOString().split('T')[0];
        if (newDate < new Date(this.resizeOrder.data.endDate)) {
          this.resizeOrder = {
            ...this.resizeOrder,
            data: { ...this.resizeOrder.data, startDate: newDateIso },
          };
        }
      } else {
        const newRight = this.resizeOriginalLeft + this.resizeOriginalWidth + deltaX;
        const newDate = this.pixelPositionToDate(newRight);
        const newDateIso = newDate.toISOString().split('T')[0];
        if (newDate > new Date(this.resizeOrder.data.startDate)) {
          this.resizeOrder = {
            ...this.resizeOrder,
            data: { ...this.resizeOrder.data, endDate: newDateIso },
          };
        }
      }

      this.cdr.detectChanges();
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (this.resizeOrder) {
        this.workOrderService.updateWorkOrder(
          this.resizeOrder.docId,
          this.resizeOrder.data
        );
        this.refreshData();
      }

      this.resizeOrder = null;
      this.cdr.detectChanges();

      // Delay clearing resizing flag so the click event that follows
      // mouseup still sees resizing=true and gets suppressed
      setTimeout(() => {
        this.resizing = false;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  getActiveBarStyle(order: WorkOrderDocument): { left: number; width: number } {
    if (this.resizing && this.resizeOrder && this.resizeOrder.docId === order.docId) {
      return this.getBarStyle(this.resizeOrder);
    }
    return this.getBarStyle(order);
  }

  // =========================================================================
  // Scroll-Wheel Zoom
  // =========================================================================

  onWheelZoom(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();

    const zoomLevels: ZoomLevel[] = ['day', 'week', 'month'];
    const currentIndex = zoomLevels.indexOf(this.zoomLevel);

    if (event.deltaY < 0 && currentIndex > 0) {
      this.onZoomChange(zoomLevels[currentIndex - 1]);
    } else if (event.deltaY > 0 && currentIndex < zoomLevels.length - 1) {
      this.onZoomChange(zoomLevels[currentIndex + 1]);
    }
  }

  // =========================================================================
  // Edit / Delete Handlers
  // =========================================================================

  onEditOrder(order: WorkOrderDocument): void {
    this.panelMode = 'edit';
    this.panelWorkCenterId = order.data.workCenterId;
    this.editingOrder = order;
    this.openPanel();
  }

  onDeleteOrder(order: WorkOrderDocument): void {
    this.deleteConfirmOrder = order;
    this.deleteConfirmOpen = true;
  }

  confirmDelete(): void {
    if (!this.deleteConfirmOrder) return;

    const order = this.deleteConfirmOrder;
    const action = this.workOrderService.deleteWorkOrder(order.docId);
    this.refreshData();

    if (action) {
      this.undoAction = action;
      this.undoToastMessage = `"${order.data.name}" deleted`;
      this.undoToastVisible = true;
    }

    this.deleteConfirmOpen = false;
    this.deleteConfirmOrder = null;
  }

  cancelDelete(): void {
    this.deleteConfirmOpen = false;
    this.deleteConfirmOrder = null;
  }

  onUndoDelete(): void {
    if (this.undoAction) {
      this.workOrderService.undoDelete(this.undoAction);
      this.refreshData();
    }
    this.undoToastVisible = false;
    this.undoAction = null;
  }

  onUndoToastDismissed(): void {
    this.undoToastVisible = false;
    this.undoAction = null;
  }

  // =========================================================================
  // Panel Controls
  // =========================================================================

  openPanel(): void {
    this.panelOpen = true;
  }

  closePanel(): void {
    this.panelOpen = false;
    this.editingOrder = null;
  }

  onPanelSave(): void {
    this.refreshData();
    this.closePanel();
  }

  onPanelDelete(): void {
    if (this.editingOrder) {
      this.onDeleteOrder(this.editingOrder);
      this.closePanel();
    }
  }

  // =========================================================================
  // Command Palette
  // =========================================================================

  onCommandExecute(action: CommandAction): void {
    this.commandPaletteOpen = false;

    switch (action.type) {
      case 'jump-to-today':
        this.scrollToToday(true);
        break;
      case 'zoom-day':
        this.onZoomChange('day');
        break;
      case 'zoom-week':
        this.onZoomChange('week');
        break;
      case 'zoom-month':
        this.onZoomChange('month');
        break;
      case 'edit-order':
        if (action.order) {
          this.onEditOrder(action.order);
        }
        break;
      case 'show-shortcuts':
        this.shortcutsOverlayOpen = true;
        break;
      case 'reset-data':
        this.workOrderService.resetToSampleData();
        this.refreshData();
        break;
    }
  }

  // =========================================================================
  // Minimap
  // =========================================================================

  updateMinimapViewport(): void {
    if (!this.timelineGrid) return;
    const container = this.timelineGrid.nativeElement;
    const totalWidth = this.columns.length * this.columnWidth;
    if (totalWidth <= 0) return;

    this.minimapViewportLeft = (container.scrollLeft / totalWidth) * 100;
    this.minimapViewportWidth = Math.min((container.clientWidth / totalWidth) * 100, 100);
  }

  onMinimapNavigate(centerPercent: number): void {
    if (!this.timelineGrid) return;
    const totalWidth = this.columns.length * this.columnWidth;
    const container = this.timelineGrid.nativeElement;
    const targetScroll = (centerPercent / 100) * totalWidth - container.clientWidth / 2;

    gsap.to(container, {
      scrollLeft: Math.max(0, targetScroll),
      duration: 0.4,
      ease: 'power3.out',
    });
  }

  // =========================================================================
  // Scroll & Hover Handlers
  // =========================================================================

  onGridScroll(): void {
    if (this.timelineHeader && this.timelineGrid) {
      this.timelineHeader.nativeElement.scrollLeft =
        this.timelineGrid.nativeElement.scrollLeft;
    }
    this.updateMinimapViewport();
    this.checkInfiniteScroll();
  }

  // =========================================================================
  // Infinite Horizontal Scroll
  // Dynamically prepend/append columns when the user scrolls near edges.
  // When prepending, scrollLeft is adjusted to maintain the visual position.
  // =========================================================================

  private checkInfiniteScroll(): void {
    if (this.infiniteScrollLocked || !this.timelineGrid) return;

    const container = this.timelineGrid.nativeElement;
    const scrollLeft = container.scrollLeft;
    const scrollRight = container.scrollWidth - container.clientWidth - scrollLeft;

    if (scrollRight < this.SCROLL_EDGE_THRESHOLD) {
      this.appendColumns();
    }

    if (scrollLeft < this.SCROLL_EDGE_THRESHOLD) {
      this.prependColumns();
    }
  }

  private appendColumns(): void {
    this.infiniteScrollLocked = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastCol = this.columns[this.columns.length - 1];

    for (let i = 1; i <= this.COLUMNS_PER_BATCH; i++) {
      const d = this.getNextColumnDate(lastCol.date, i);
      this.columns.push(this.createColumn(d, today));
    }

    this.updateTimelineRange();
    this.cdr.detectChanges();

    // Allow next scroll check after a short cooldown
    requestAnimationFrame(() => {
      this.infiniteScrollLocked = false;
    });
  }

  private prependColumns(): void {
    this.infiniteScrollLocked = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstCol = this.columns[0];
    const addedWidth = this.COLUMNS_PER_BATCH * this.columnWidth;
    const newCols: TimelineColumn[] = [];

    for (let i = this.COLUMNS_PER_BATCH; i >= 1; i--) {
      const d = this.getPrevColumnDate(firstCol.date, i);
      newCols.push(this.createColumn(d, today));
    }

    this.columns = [...newCols, ...this.columns];
    this.updateTimelineRange();
    this.cdr.detectChanges();

    // Adjust scroll position to keep the viewport in place
    requestAnimationFrame(() => {
      if (this.timelineGrid) {
        this.timelineGrid.nativeElement.scrollLeft += addedWidth;
        if (this.timelineHeader) {
          this.timelineHeader.nativeElement.scrollLeft = this.timelineGrid.nativeElement.scrollLeft;
        }
      }
      this.infiniteScrollLocked = false;
    });
  }

  /** Create a single TimelineColumn for a given date */
  private createColumn(date: Date, today: Date): TimelineColumn {
    switch (this.zoomLevel) {
      case 'day':
        return {
          label: this.formatDayLabel(date),
          date: new Date(date),
          isToday: date.getTime() === today.getTime(),
          isCurrentPeriod: date.getTime() === today.getTime(),
        };
      case 'week': {
        const isCurrentWeek =
          today >= date && today < new Date(date.getTime() + 7 * 86400000);
        return {
          label: this.formatWeekLabel(date),
          date: new Date(date),
          isToday: false,
          isCurrentPeriod: isCurrentWeek,
        };
      }
      case 'month': {
        const isCurrentMonth =
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth();
        return {
          label: this.formatMonthLabel(date),
          date: new Date(date),
          isToday: false,
          isCurrentPeriod: isCurrentMonth,
        };
      }
    }
  }

  /** Get the date N steps after `from` based on current zoom level */
  private getNextColumnDate(from: Date, steps: number): Date {
    const d = new Date(from);
    switch (this.zoomLevel) {
      case 'day':
        d.setDate(d.getDate() + steps);
        break;
      case 'week':
        d.setDate(d.getDate() + steps * 7);
        break;
      case 'month':
        d.setMonth(d.getMonth() + steps);
        break;
    }
    return d;
  }

  /** Get the date N steps before `from` based on current zoom level */
  private getPrevColumnDate(from: Date, steps: number): Date {
    const d = new Date(from);
    switch (this.zoomLevel) {
      case 'day':
        d.setDate(d.getDate() - steps);
        break;
      case 'week':
        d.setDate(d.getDate() - steps * 7);
        break;
      case 'month':
        d.setMonth(d.getMonth() - steps);
        break;
    }
    return d;
  }

  /** Update timelineStartDate, timelineEndDate, and todayPosition after columns change */
  private updateTimelineRange(): void {
    if (this.columns.length > 0) {
      this.timelineStartDate = this.columns[0].date;
      const lastCol = this.columns[this.columns.length - 1];
      this.timelineEndDate = this.getColumnEndDate(lastCol.date);
    }
    this.calculateTodayPosition();
  }

  onRowHover(centerId: string): void {
    this.hoveredRowId = centerId;
  }

  onRowLeave(): void {
    this.hoveredRowId = null;
  }

  toggleZoomDropdown(): void {
    this.zoomDropdownOpen = !this.zoomDropdownOpen;
  }

  // =========================================================================
  // Global Event Handlers
  // =========================================================================

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.zoom-dropdown-wrapper') && !target.closest('ng-dropdown-panel')) {
      this.zoomDropdownOpen = false;
    }
    if (!target.closest('.bar-context-menu') && !target.closest('.bar-menu-btn')) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.deleteConfirmOpen) {
        this.cancelDelete();
        return;
      }
      if (this.menuOpen) {
        this.closeMenu();
        return;
      }
      if (this.commandPaletteOpen) {
        this.commandPaletteOpen = false;
        return;
      }
      if (this.shortcutsOverlayOpen) {
        this.shortcutsOverlayOpen = false;
        return;
      }
      if (this.panelOpen) {
        this.closePanel();
        return;
      }
      this.zoomDropdownOpen = false;
      return;
    }

    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    if (isInput) return;

    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.commandPaletteOpen = !this.commandPaletteOpen;
      return;
    }

    if (event.key === '?' && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      this.shortcutsOverlayOpen = !this.shortcutsOverlayOpen;
      return;
    }

    if (event.key === 't' || event.key === 'T') {
      this.scrollToToday(true);
      return;
    }

    if (event.key === '1') {
      this.onZoomChange('day');
      return;
    }
    if (event.key === '2') {
      this.onZoomChange('week');
      return;
    }
    if (event.key === '3') {
      this.onZoomChange('month');
      return;
    }

    if (event.key === 'ArrowLeft' && this.timelineGrid) {
      this.timelineGrid.nativeElement.scrollLeft -= this.columnWidth;
      return;
    }
    if (event.key === 'ArrowRight' && this.timelineGrid) {
      this.timelineGrid.nativeElement.scrollLeft += this.columnWidth;
      return;
    }
  }

  // =========================================================================
  // Three-Dot Context Menu
  // =========================================================================

  onBarMenuClick(order: WorkOrderDocument, pos: { x: number; y: number }): void {
    this.menuOrder = order;
    this.menuX = pos.x;
    this.menuY = pos.y;
    this.menuOpen = true;
  }

  onMenuEdit(): void {
    if (this.menuOrder) {
      this.onEditOrder(this.menuOrder);
    }
    this.closeMenu();
  }

  onMenuDelete(): void {
    if (this.menuOrder) {
      this.onDeleteOrder(this.menuOrder);
    }
    this.closeMenu();
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.menuOrder = null;
  }

  // =========================================================================
  // Contextual Cursors
  // =========================================================================

  onTimelineMouseMove(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (target.closest('.resize-handle')) {
      this.cursorStyle = 'col-resize';
    } else if (target.closest('.work-order-bar')) {
      this.cursorStyle = 'pointer';
    } else if (target.closest('.timeline-row')) {
      this.cursorStyle = 'crosshair';
    } else {
      this.cursorStyle = 'default';
    }
  }

  // =========================================================================
  // Animate Initial Load
  // =========================================================================

  // @upgrade: Replace GSAP dependency with Angular's built-in @angular/animations
  // or Web Animations API for smaller bundle size. GSAP adds ~30KB gzipped.
  private animateInitialLoad(): void {
    const rows = document.querySelectorAll('.timeline-row');
    gsap.from(rows, {
      opacity: 0,
      y: 12,
      duration: 0.4,
      stagger: 0.04,
      ease: 'power3.out',
    });
  }

  // =========================================================================
  // Formatting Helpers
  // =========================================================================

  private formatDayLabel(date: Date): string {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day} ${month}`;
  }

  private formatWeekLabel(date: Date): string {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  private formatMonthLabel(date: Date): string {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${year}`;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  trackByCenter(_: number, center: WorkCenterDocument): string {
    return center.docId;
  }

  trackByOrder(_: number, order: WorkOrderDocument): string {
    return order.docId;
  }

  trackByColumn(index: number, col: TimelineColumn): string {
    return col.date.toISOString();
  }

  get totalTimelineWidth(): number {
    return this.columns.length * this.columnWidth;
  }

  get currentZoomLabel(): string {
    return this.zoomOptions.find((o) => o.value === this.zoomLevel)?.label || 'Month';
  }
}
