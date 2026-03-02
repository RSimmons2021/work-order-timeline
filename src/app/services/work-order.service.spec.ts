import { TestBed } from '@angular/core/testing';
import { WorkOrderService } from './work-order.service';
import { WorkOrderDocument } from '../models/work-order.model';

// Helper to build a minimal work order for tests
function makeOrder(
  id: string,
  centerId: string,
  start: string,
  end: string
): WorkOrderDocument {
  return {
    docId: id,
    docType: 'workOrder',
    data: { name: id, workCenterId: centerId, status: 'open', startDate: start, endDate: end },
  };
}

describe('WorkOrderService', () => {
  let service: WorkOrderService;

  beforeEach(() => {
    // Clear localStorage so each test starts fresh
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkOrderService);
    // Wipe the sample data loaded from storage so tests are isolated
    service.resetToSampleData();
    // Clear all orders for a clean state
    service.workOrders().forEach((o) => service.deleteWorkOrder(o.docId));
  });

  // =========================================================================
  // checkOverlap
  // =========================================================================

  describe('checkOverlap()', () => {
    beforeEach(() => {
      // Seed one existing order: Jan 10–Jan 20
      service.createWorkOrder({
        name: 'Existing',
        workCenterId: 'wc-test',
        status: 'open',
        startDate: '2025-01-10',
        endDate: '2025-01-20',
      });
    });

    it('returns false when there are no orders on the work center', () => {
      expect(service.checkOverlap('wc-other', '2025-01-10', '2025-01-20')).toBeFalse();
    });

    it('returns false for a range entirely before the existing order', () => {
      expect(service.checkOverlap('wc-test', '2025-01-01', '2025-01-09')).toBeFalse();
    });

    it('returns false for a range entirely after the existing order', () => {
      expect(service.checkOverlap('wc-test', '2025-01-21', '2025-01-30')).toBeFalse();
    });

    it('returns true when new range is completely inside existing order', () => {
      expect(service.checkOverlap('wc-test', '2025-01-12', '2025-01-18')).toBeTrue();
    });

    it('returns true when new range completely wraps the existing order', () => {
      expect(service.checkOverlap('wc-test', '2025-01-05', '2025-01-25')).toBeTrue();
    });

    it('returns true when new range starts inside existing order', () => {
      expect(service.checkOverlap('wc-test', '2025-01-15', '2025-01-25')).toBeTrue();
    });

    it('returns true when new range ends inside existing order', () => {
      expect(service.checkOverlap('wc-test', '2025-01-05', '2025-01-15')).toBeTrue();
    });

    it('excludes the order being edited from overlap check', () => {
      const existing = service.workOrders().find((o) => o.data.name === 'Existing')!;
      // Editing same order with same dates — should NOT self-overlap
      expect(
        service.checkOverlap('wc-test', '2025-01-10', '2025-01-20', existing.docId)
      ).toBeFalse();
    });
  });

  // =========================================================================
  // createWorkOrder
  // =========================================================================

  describe('createWorkOrder()', () => {
    it('creates a work order and adds it to the signal', () => {
      const before = service.workOrders().length;
      const result = service.createWorkOrder({
        name: 'New Order',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-03-01',
        endDate: '2025-03-10',
      });
      expect(result.success).toBeTrue();
      expect(service.workOrders().length).toBe(before + 1);
    });

    it('returns success: false when order overlaps an existing one', () => {
      service.createWorkOrder({
        name: 'First',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-03-01',
        endDate: '2025-03-15',
      });
      const result = service.createWorkOrder({
        name: 'Second',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-03-10', // overlaps First
        endDate: '2025-03-20',
      });
      expect(result.success).toBeFalse();
      expect(result.error).toBeTruthy();
    });

    it('allows two non-overlapping orders on the same work center', () => {
      const r1 = service.createWorkOrder({
        name: 'First',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-03-01',
        endDate: '2025-03-10',
      });
      const r2 = service.createWorkOrder({
        name: 'Second',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-03-11',
        endDate: '2025-03-20',
      });
      expect(r1.success).toBeTrue();
      expect(r2.success).toBeTrue();
    });

    it('allows overlapping dates on different work centers', () => {
      const r1 = service.createWorkOrder({
        name: 'Center A Order',
        workCenterId: 'wc-a',
        status: 'open',
        startDate: '2025-03-01',
        endDate: '2025-03-15',
      });
      const r2 = service.createWorkOrder({
        name: 'Center B Order',
        workCenterId: 'wc-b',
        status: 'open',
        startDate: '2025-03-01', // same dates, different center
        endDate: '2025-03-15',
      });
      expect(r1.success).toBeTrue();
      expect(r2.success).toBeTrue();
    });
  });

  // =========================================================================
  // updateWorkOrder
  // =========================================================================

  describe('updateWorkOrder()', () => {
    let orderId: string;

    beforeEach(() => {
      service.createWorkOrder({
        name: 'Original',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-04-01',
        endDate: '2025-04-10',
      });
      orderId = service.workOrders().find((o) => o.data.name === 'Original')!.docId;
    });

    it('updates the work order data', () => {
      service.updateWorkOrder(orderId, {
        name: 'Updated',
        workCenterId: 'wc-1',
        status: 'in-progress',
        startDate: '2025-04-01',
        endDate: '2025-04-10',
      });
      const updated = service.workOrders().find((o) => o.docId === orderId)!;
      expect(updated.data.name).toBe('Updated');
      expect(updated.data.status).toBe('in-progress');
    });

    it('returns false if updated dates overlap another order (excluding itself)', () => {
      service.createWorkOrder({
        name: 'Blocker',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-04-15',
        endDate: '2025-04-25',
      });
      const result = service.updateWorkOrder(orderId, {
        name: 'Original',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-04-05', // now overlaps Blocker
        endDate: '2025-04-20',
      });
      expect(result.success).toBeFalse();
    });

    it('allows editing an order to its same date range (no self-overlap)', () => {
      const result = service.updateWorkOrder(orderId, {
        name: 'Original',
        workCenterId: 'wc-1',
        status: 'complete',
        startDate: '2025-04-01',
        endDate: '2025-04-10',
      });
      expect(result.success).toBeTrue();
    });
  });

  // =========================================================================
  // deleteWorkOrder + undoDelete
  // =========================================================================

  describe('deleteWorkOrder()', () => {
    let orderId: string;

    beforeEach(() => {
      service.createWorkOrder({
        name: 'To Delete',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-05-01',
        endDate: '2025-05-10',
      });
      orderId = service.workOrders().find((o) => o.data.name === 'To Delete')!.docId;
    });

    it('removes the work order from the signal', () => {
      service.deleteWorkOrder(orderId);
      expect(service.workOrders().find((o) => o.docId === orderId)).toBeUndefined();
    });

    it('returns an UndoAction with the deleted order', () => {
      const action = service.deleteWorkOrder(orderId);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('delete');
      expect(action!.order.docId).toBe(orderId);
    });

    it('returns null when docId does not exist', () => {
      const action = service.deleteWorkOrder('non-existent-id');
      expect(action).toBeNull();
    });
  });

  describe('undoDelete()', () => {
    let orderId: string;

    beforeEach(() => {
      service.createWorkOrder({
        name: 'Undoable',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-06-01',
        endDate: '2025-06-10',
      });
      orderId = service.workOrders().find((o) => o.data.name === 'Undoable')!.docId;
    });

    it('restores the deleted work order', () => {
      const action = service.deleteWorkOrder(orderId)!;
      const restored = service.undoDelete(action);
      expect(restored).toBeTrue();
      expect(service.workOrders().find((o) => o.docId === orderId)).toBeTruthy();
    });

    it('returns false if restoring would cause an overlap', () => {
      const action = service.deleteWorkOrder(orderId)!;
      // Create an overlapping order while the original is deleted
      service.createWorkOrder({
        name: 'Blocker',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-06-05',
        endDate: '2025-06-15',
      });
      const restored = service.undoDelete(action);
      expect(restored).toBeFalse();
    });
  });

  // =========================================================================
  // findAvailableSlots
  // =========================================================================

  describe('findAvailableSlots()', () => {
    it('returns suggestions when work center is empty', () => {
      const slots = service.findAvailableSlots('wc-empty', 7);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].startDate).toBeTruthy();
      expect(slots[0].endDate).toBeTruthy();
    });

    it('returns suggestions that do not overlap existing orders', () => {
      service.createWorkOrder({
        name: 'Blocker',
        workCenterId: 'wc-slots',
        status: 'open',
        startDate: '2025-07-01',
        endDate: '2025-07-20',
      });
      const slots = service.findAvailableSlots('wc-slots', 7, '2025-07-01');
      for (const slot of slots) {
        const hasOverlap = service.checkOverlap('wc-slots', slot.startDate, slot.endDate);
        expect(hasOverlap).toBeFalse();
      }
    });

    it('returns up to 3 suggestions', () => {
      const slots = service.findAvailableSlots('wc-empty2', 5);
      expect(slots.length).toBeLessThanOrEqual(3);
    });

    it('each suggestion slot has the correct duration', () => {
      const durationDays = 10;
      const slots = service.findAvailableSlots('wc-dur', durationDays);
      for (const slot of slots) {
        const start = new Date(slot.startDate).getTime();
        const end = new Date(slot.endDate).getTime();
        const days = (end - start) / 86400000;
        expect(days).toBe(durationDays);
      }
    });
  });

  // =========================================================================
  // localStorage persistence
  // =========================================================================

  describe('localStorage persistence', () => {
    it('persists created orders across service re-instantiation', () => {
      service.createWorkOrder({
        name: 'Persisted',
        workCenterId: 'wc-persist',
        status: 'complete',
        startDate: '2025-08-01',
        endDate: '2025-08-10',
      });

      // Re-create the service (simulates page reload)
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const reloaded = TestBed.inject(WorkOrderService);

      const found = reloaded.workOrders().find((o) => o.data.name === 'Persisted');
      expect(found).toBeTruthy();
    });
  });
});
