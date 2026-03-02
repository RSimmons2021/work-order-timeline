import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineComponent, ZoomLevel } from './timeline.component';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('TimelineComponent', () => {
  let component: TimelineComponent;
  let fixture: ComponentFixture<TimelineComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TimelineComponent],
      providers: [provideAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(TimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads work centers and work orders from the service', () => {
    expect(component.workCenters.length).toBeGreaterThan(0);
    expect(component.workOrders.length).toBeGreaterThan(0);
  });

  it('defaults to week zoom level', () => {
    expect(component.zoomLevel).toBe('week');
  });

  it('generates columns on init', () => {
    expect(component.columns.length).toBeGreaterThan(0);
  });

  it('generates 25 week columns (±12 from today) by default', () => {
    expect(component.columns.length).toBe(25);
  });

  // =========================================================================
  // Zoom level switching
  // =========================================================================

  describe('onZoomChange()', () => {
    it('switches to day view and generates 61 columns (±30 days)', () => {
      component.onZoomChange('day');
      expect(component.zoomLevel).toBe('day');
      expect(component.columns.length).toBe(61);
      expect(component.columnWidth).toBe(60);
    });

    it('switches to week view and generates 25 columns (±12 weeks)', () => {
      component.onZoomChange('week');
      expect(component.zoomLevel).toBe('week');
      expect(component.columns.length).toBe(25);
      expect(component.columnWidth).toBe(90);
    });

    it('switches to month view and generates 13 columns (±6 months)', () => {
      component.onZoomChange('month');
      expect(component.zoomLevel).toBe('month');
      expect(component.columns.length).toBe(13);
      expect(component.columnWidth).toBe(114);
    });

    it('does not regenerate columns when the same zoom is selected', () => {
      component.onZoomChange('month');
      const colsBefore = component.columns.length;
      component.onZoomChange('month'); // same level
      expect(component.columns.length).toBe(colsBefore);
    });
  });

  // =========================================================================
  // totalTimelineWidth
  // =========================================================================

  describe('totalTimelineWidth', () => {
    it('equals columns * columnWidth', () => {
      expect(component.totalTimelineWidth).toBe(
        component.columns.length * component.columnWidth
      );
    });

    it('updates when zoom changes', () => {
      component.onZoomChange('day');
      expect(component.totalTimelineWidth).toBe(61 * 60);
    });
  });

  // =========================================================================
  // dateToPixelPosition
  // =========================================================================

  describe('dateToPixelPosition()', () => {
    it('returns 0 for the timeline start date', () => {
      const pos = component.dateToPixelPosition(component.timelineStartDate);
      expect(pos).toBeCloseTo(0, 0);
    });

    it('returns totalTimelineWidth for the timeline end date', () => {
      const pos = component.dateToPixelPosition(component.timelineEndDate);
      expect(pos).toBeCloseTo(component.totalTimelineWidth, 0);
    });

    it('returns a positive value for today (today is in range)', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pos = component.dateToPixelPosition(today);
      expect(pos).toBeGreaterThan(0);
      expect(pos).toBeLessThan(component.totalTimelineWidth);
    });
  });

  // =========================================================================
  // pixelPositionToDate (round-trip)
  // =========================================================================

  describe('pixelPositionToDate()', () => {
    it('round-trips: date → pixel → date gives the same date', () => {
      const original = new Date();
      original.setHours(0, 0, 0, 0);
      const px = component.dateToPixelPosition(original);
      const result = component.pixelPositionToDate(px);
      // Allow ±1 day tolerance due to rounding in month columns
      const diff = Math.abs(result.getTime() - original.getTime());
      expect(diff).toBeLessThan(86400000 * 2);
    });
  });

  // =========================================================================
  // getBarStyle
  // =========================================================================

  describe('getBarStyle()', () => {
    it('returns a positive left value for a work order starting after timeline start', () => {
      const order = component.workOrders[0];
      const style = component.getBarStyle(order);
      expect(style.left).toBeGreaterThanOrEqual(0);
    });

    it('returns a minimum width of 20px', () => {
      const order = component.workOrders[0];
      const style = component.getBarStyle(order);
      expect(style.width).toBeGreaterThanOrEqual(20);
    });
  });

  // =========================================================================
  // getOrdersForCenter
  // =========================================================================

  describe('getOrdersForCenter()', () => {
    it('returns only orders for the given work center', () => {
      const centerId = component.workCenters[0].docId;
      const orders = component.getOrdersForCenter(centerId);
      orders.forEach((o) => {
        expect(o.data.workCenterId).toBe(centerId);
      });
    });

    it('returns empty array for a work center with no orders', () => {
      const orders = component.getOrdersForCenter('non-existent-center');
      expect(orders).toEqual([]);
    });
  });

  // =========================================================================
  // Panel state
  // =========================================================================

  describe('panel open/close', () => {
    it('opens the panel', () => {
      component.openPanel();
      expect(component.panelOpen).toBeTrue();
    });

    it('closes the panel and clears editingOrder', () => {
      component.panelOpen = true;
      component.editingOrder = component.workOrders[0];
      component.closePanel();
      expect(component.panelOpen).toBeFalse();
      expect(component.editingOrder).toBeNull();
    });

    it('refreshes data and closes panel on save', () => {
      component.panelOpen = true;
      component.onPanelSave();
      expect(component.panelOpen).toBeFalse();
    });
  });

  // =========================================================================
  // currentZoomLabel
  // =========================================================================

  describe('currentZoomLabel', () => {
    it('returns "Week" by default', () => {
      expect(component.currentZoomLabel).toBe('Week');
    });

    it('returns "Day" after switching to day zoom', () => {
      component.onZoomChange('day');
      expect(component.currentZoomLabel).toBe('Day');
    });
  });
});
