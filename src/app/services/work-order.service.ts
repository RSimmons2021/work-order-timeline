import { Injectable, signal } from '@angular/core';
import { WorkCenterDocument } from '../models/work-center.model';
import { WorkOrderDocument, WorkOrderStatus } from '../models/work-order.model';
import { SAMPLE_WORK_CENTERS, SAMPLE_WORK_ORDERS } from '../data/sample-data';

const STORAGE_KEY_CENTERS = 'nao_work_centers';
const STORAGE_KEY_ORDERS = 'nao_work_orders';

export interface UndoAction {
  type: 'delete';
  order: WorkOrderDocument;
  timestamp: number;
}

export interface SlotSuggestion {
  startDate: string;
  endDate: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  /** Reactive state using Angular signals */
  private workCentersSignal = signal<WorkCenterDocument[]>([]);
  private workOrdersSignal = signal<WorkOrderDocument[]>([]);

  readonly workCenters = this.workCentersSignal.asReadonly();
  readonly workOrders = this.workOrdersSignal.asReadonly();

  /** Undo stack */
  private undoStack: UndoAction[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // @upgrade: Replace localStorage with IndexedDB (via idb library) for larger
  // datasets and structured queries. localStorage has a ~5MB limit and blocks
  // the main thread on serialization.
  /** Load data from localStorage, falling back to sample data */
  private loadFromStorage(): void {
    const centersJson = localStorage.getItem(STORAGE_KEY_CENTERS);
    const ordersJson = localStorage.getItem(STORAGE_KEY_ORDERS);

    if (centersJson && ordersJson) {
      this.workCentersSignal.set(JSON.parse(centersJson));
      this.workOrdersSignal.set(JSON.parse(ordersJson));
    } else {
      this.workCentersSignal.set(SAMPLE_WORK_CENTERS);
      this.workOrdersSignal.set(SAMPLE_WORK_ORDERS);
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY_CENTERS, JSON.stringify(this.workCentersSignal()));
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.workOrdersSignal()));
  }

  // @upgrade: Use crypto.randomUUID() for guaranteed uniqueness, or a
  // server-assigned ID when backed by a real API.
  private generateId(): string {
    return 'wo-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /** Get all work orders for a specific work center */
  getOrdersForWorkCenter(workCenterId: string): WorkOrderDocument[] {
    return this.workOrdersSignal().filter(
      (wo) => wo.data.workCenterId === workCenterId
    );
  }

  /**
   * Check if a work order would overlap with existing orders on the same work center.
   * Excludes the order being edited (by docId) from the check.
   * Two date ranges [s1, e1] and [s2, e2] overlap when s1 < e2 AND s2 < e1
   */
  checkOverlap(
    workCenterId: string,
    startDate: string,
    endDate: string,
    excludeDocId?: string
  ): boolean {
    const orders = this.getOrdersForWorkCenter(workCenterId);
    const newStart = new Date(startDate).getTime();
    const newEnd = new Date(endDate).getTime();

    return orders.some((order) => {
      if (excludeDocId && order.docId === excludeDocId) return false;
      const existStart = new Date(order.data.startDate).getTime();
      const existEnd = new Date(order.data.endDate).getTime();
      return newStart < existEnd && existStart < newEnd;
    });
  }

  /**
   * Find the next available slot on a work center that can fit a given duration.
   * Returns up to 3 suggestions starting from today or the requested start date.
   */
  findAvailableSlots(
    workCenterId: string,
    durationDays: number,
    preferredStartDate?: string,
    excludeDocId?: string
  ): SlotSuggestion[] {
    const orders = this.getOrdersForWorkCenter(workCenterId)
      .filter((o) => !excludeDocId || o.docId !== excludeDocId)
      .map((o) => ({
        start: new Date(o.data.startDate).getTime(),
        end: new Date(o.data.endDate).getTime(),
      }))
      .sort((a, b) => a.start - b.start);

    const suggestions: SlotSuggestion[] = [];
    const msPerDay = 86400000;
    const durationMs = durationDays * msPerDay;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let cursor = preferredStartDate
      ? new Date(preferredStartDate).getTime()
      : now.getTime();

    // Ensure cursor is not in the past
    if (cursor < now.getTime()) {
      cursor = now.getTime();
    }

    let maxIterations = 50;
    while (suggestions.length < 3 && maxIterations-- > 0) {
      const slotEnd = cursor + durationMs;
      const hasOverlap = orders.some(
        (o) => cursor < o.end && o.start < slotEnd
      );

      if (!hasOverlap) {
        const startDate = new Date(cursor);
        const endDate = new Date(slotEnd);
        const startIso = startDate.toISOString().split('T')[0];
        const endIso = endDate.toISOString().split('T')[0];

        const daysFromNow = Math.round((cursor - now.getTime()) / msPerDay);
        let label: string;
        if (daysFromNow === 0) {
          label = 'Starting today';
        } else if (daysFromNow === 1) {
          label = 'Starting tomorrow';
        } else {
          label = `Starting in ${daysFromNow} days`;
        }

        suggestions.push({ startDate: startIso, endDate: endIso, label });
        cursor = slotEnd + msPerDay; // Move past this slot
      } else {
        // Jump cursor to end of the overlapping order
        const overlapping = orders.find(
          (o) => cursor < o.end && o.start < slotEnd
        );
        if (overlapping) {
          cursor = overlapping.end;
        } else {
          cursor += msPerDay;
        }
      }
    }

    return suggestions;
  }

  /** Create a new work order */
  createWorkOrder(data: {
    name: string;
    workCenterId: string;
    status: WorkOrderStatus;
    startDate: string;
    endDate: string;
  }): { success: boolean; error?: string } {
    if (this.checkOverlap(data.workCenterId, data.startDate, data.endDate)) {
      return {
        success: false,
        error: 'Work order overlaps with an existing order on this work center.',
      };
    }

    const newOrder: WorkOrderDocument = {
      docId: this.generateId(),
      docType: 'workOrder',
      data: { ...data },
    };

    this.workOrdersSignal.update((orders) => [...orders, newOrder]);
    this.saveToStorage();
    return { success: true };
  }

  /** Update an existing work order */
  updateWorkOrder(
    docId: string,
    data: {
      name: string;
      workCenterId: string;
      status: WorkOrderStatus;
      startDate: string;
      endDate: string;
    }
  ): { success: boolean; error?: string } {
    if (this.checkOverlap(data.workCenterId, data.startDate, data.endDate, docId)) {
      return {
        success: false,
        error: 'Work order overlaps with an existing order on this work center.',
      };
    }

    this.workOrdersSignal.update((orders) =>
      orders.map((order) =>
        order.docId === docId
          ? { ...order, data: { ...data } }
          : order
      )
    );
    this.saveToStorage();
    return { success: true };
  }

  /** Delete a work order (soft delete with undo support) */
  deleteWorkOrder(docId: string): UndoAction | null {
    const order = this.workOrdersSignal().find((o) => o.docId === docId);
    if (!order) return null;

    const undoAction: UndoAction = {
      type: 'delete',
      order: { ...order, data: { ...order.data } },
      timestamp: Date.now(),
    };

    this.undoStack.push(undoAction);

    this.workOrdersSignal.update((orders) =>
      orders.filter((o) => o.docId !== docId)
    );
    this.saveToStorage();

    return undoAction;
  }

  /** Undo the last delete action */
  undoDelete(action: UndoAction): boolean {
    if (action.type !== 'delete') return false;

    // Check for overlap before restoring
    const order = action.order;
    if (this.checkOverlap(order.data.workCenterId, order.data.startDate, order.data.endDate)) {
      return false;
    }

    this.workOrdersSignal.update((orders) => [...orders, order]);
    this.saveToStorage();

    // Remove from undo stack
    this.undoStack = this.undoStack.filter((a) => a !== action);
    return true;
  }

  /** Reset to sample data (useful for demo) */
  resetToSampleData(): void {
    this.workCentersSignal.set(SAMPLE_WORK_CENTERS);
    this.workOrdersSignal.set(SAMPLE_WORK_ORDERS);
    this.saveToStorage();
  }
}
