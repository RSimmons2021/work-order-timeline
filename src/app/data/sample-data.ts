import { WorkCenterDocument } from '../models/work-center.model';
import { WorkOrderDocument } from '../models/work-order.model';

/**
 * Generate dates relative to today for sample data
 * This ensures work orders are always visible around the current date
 */
function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export const SAMPLE_WORK_CENTERS: WorkCenterDocument[] = [
  {
    docId: 'wc-001',
    docType: 'workCenter',
    data: { name: 'Genesis Hardware' },
  },
  {
    docId: 'wc-002',
    docType: 'workCenter',
    data: { name: 'Rodriques Electrics' },
  },
  {
    docId: 'wc-003',
    docType: 'workCenter',
    data: { name: 'Konsulting Inc' },
  },
  {
    docId: 'wc-004',
    docType: 'workCenter',
    data: { name: 'McMarrow Distribution' },
  },
  {
    docId: 'wc-005',
    docType: 'workCenter',
    data: { name: 'Spartan Manufacturing' },
  },
  {
    docId: 'wc-006',
    docType: 'workCenter',
    data: { name: 'Apex Dynamics' },
  },
];

export const SAMPLE_WORK_ORDERS: WorkOrderDocument[] = [
  // Genesis Hardware - Complete order (past)
  {
    docId: 'wo-001',
    docType: 'workOrder',
    data: {
      name: 'Concentrix Ltd',
      workCenterId: 'wc-001',
      status: 'complete',
      startDate: daysFromToday(-25),
      endDate: daysFromToday(-5),
    },
  },
  // Konsulting Inc - Two non-overlapping orders (In Progress + In Progress)
  {
    docId: 'wo-002',
    docType: 'workOrder',
    data: {
      name: 'Konsulting Inc',
      workCenterId: 'wc-003',
      status: 'in-progress',
      startDate: daysFromToday(-15),
      endDate: daysFromToday(5),
    },
  },
  {
    docId: 'wo-003',
    docType: 'workOrder',
    data: {
      name: 'Compleks Systems',
      workCenterId: 'wc-003',
      status: 'in-progress',
      startDate: daysFromToday(8),
      endDate: daysFromToday(28),
    },
  },
  // McMarrow Distribution - Blocked
  {
    docId: 'wo-004',
    docType: 'workOrder',
    data: {
      name: 'McMarrow Distribution',
      workCenterId: 'wc-004',
      status: 'blocked',
      startDate: daysFromToday(-10),
      endDate: daysFromToday(15),
    },
  },
  // Spartan Manufacturing - Open
  {
    docId: 'wo-005',
    docType: 'workOrder',
    data: {
      name: 'Spartan Assembly Line',
      workCenterId: 'wc-005',
      status: 'open',
      startDate: daysFromToday(2),
      endDate: daysFromToday(20),
    },
  },
  // Genesis Hardware - Another order (open, future)
  {
    docId: 'wo-006',
    docType: 'workOrder',
    data: {
      name: 'Genesis Batch #42',
      workCenterId: 'wc-001',
      status: 'open',
      startDate: daysFromToday(5),
      endDate: daysFromToday(18),
    },
  },
  // Rodriques Electrics - In Progress
  {
    docId: 'wo-007',
    docType: 'workOrder',
    data: {
      name: 'Rodriques PCB Run',
      workCenterId: 'wc-002',
      status: 'in-progress',
      startDate: daysFromToday(-7),
      endDate: daysFromToday(10),
    },
  },
  // Apex Dynamics - Complete
  {
    docId: 'wo-008',
    docType: 'workOrder',
    data: {
      name: 'Apex Turbine Overhaul',
      workCenterId: 'wc-006',
      status: 'complete',
      startDate: daysFromToday(-30),
      endDate: daysFromToday(-12),
    },
  },
  // Apex Dynamics - Blocked (future)
  {
    docId: 'wo-009',
    docType: 'workOrder',
    data: {
      name: 'Apex Motor Assembly',
      workCenterId: 'wc-006',
      status: 'blocked',
      startDate: daysFromToday(-3),
      endDate: daysFromToday(14),
    },
  },
  // Spartan Manufacturing - Second order
  {
    docId: 'wo-010',
    docType: 'workOrder',
    data: {
      name: 'Spartan QC Batch',
      workCenterId: 'wc-005',
      status: 'complete',
      startDate: daysFromToday(-20),
      endDate: daysFromToday(-5),
    },
  },
];
