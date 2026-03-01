import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  AfterViewInit,
  ElementRef,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  NgbDatepickerModule,
  NgbDateStruct,
} from '@ng-bootstrap/ng-bootstrap';
import { WorkOrderDocument, WorkOrderStatus } from '../../models/work-order.model';
import { WorkCenterDocument } from '../../models/work-center.model';
import { WorkOrderService, SlotSuggestion } from '../../services/work-order.service';
import gsap from 'gsap';

@Component({
  selector: 'app-work-order-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectModule,
    NgbDatepickerModule,
  ],
  templateUrl: './work-order-panel.component.html',
  styleUrl: './work-order-panel.component.scss',
})
export class WorkOrderPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() workCenterId = '';
  @Input() startDate = '';
  @Input() editingOrder: WorkOrderDocument | null = null;
  @Input() workCenters: WorkCenterDocument[] = [];

  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  overlapError = '';
  slotSuggestions: SlotSuggestion[] = [];

  statusOptions = [
    { label: 'Open', value: 'open' as WorkOrderStatus },
    { label: 'In Progress', value: 'in-progress' as WorkOrderStatus },
    { label: 'Complete', value: 'complete' as WorkOrderStatus },
    { label: 'Blocked', value: 'blocked' as WorkOrderStatus },
  ];

  constructor(
    private workOrderService: WorkOrderService,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngAfterViewInit(): void {
    const panel = this.elementRef.nativeElement.querySelector('.panel-container');
    if (panel) {
      gsap.from(panel, {
        x: '100%',
        duration: 0.35,
        ease: 'power3.out',
      });
    }
  }

  ngOnDestroy(): void {}

  private initForm(): void {
    if (this.mode === 'edit' && this.editingOrder) {
      const order = this.editingOrder;
      this.form = new FormGroup(
        {
          name: new FormControl(order.data.name, [Validators.required]),
          status: new FormControl(order.data.status, [Validators.required]),
          startDate: new FormControl(
            this.isoToNgbDate(order.data.startDate),
            [Validators.required]
          ),
          endDate: new FormControl(
            this.isoToNgbDate(order.data.endDate),
            [Validators.required]
          ),
        },
        { validators: this.dateRangeValidator }
      );
    } else {
      const start = this.startDate || new Date().toISOString().split('T')[0];
      const endDateObj = new Date(start);
      endDateObj.setDate(endDateObj.getDate() + 7);
      const end = endDateObj.toISOString().split('T')[0];

      this.form = new FormGroup(
        {
          name: new FormControl('', [Validators.required]),
          status: new FormControl('open' as WorkOrderStatus, [Validators.required]),
          startDate: new FormControl(this.isoToNgbDate(start), [Validators.required]),
          endDate: new FormControl(this.isoToNgbDate(end), [Validators.required]),
        },
        { validators: this.dateRangeValidator }
      );
    }
  }

  /** Cross-field validator: endDate must be after startDate */
  private dateRangeValidator = (group: AbstractControl): ValidationErrors | null => {
    const start = group.get('startDate')?.value as NgbDateStruct | null;
    const end = group.get('endDate')?.value as NgbDateStruct | null;
    if (!start || !end) return null;

    const startDate = new Date(start.year, start.month - 1, start.day);
    const endDate = new Date(end.year, end.month - 1, end.day);

    if (endDate <= startDate) {
      return { dateRange: 'End date must be after start date' };
    }
    return null;
  };

  /** Convert ISO date string to NgbDateStruct */
  private isoToNgbDate(iso: string): NgbDateStruct {
    const [year, month, day] = iso.split('-').map(Number);
    return { year, month, day };
  }

  /** Convert NgbDateStruct to ISO date string */
  private ngbDateToIso(date: NgbDateStruct): string {
    const y = date.year;
    const m = String(date.month).padStart(2, '0');
    const d = String(date.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  get workCenterName(): string {
    const wc = this.workCenters.find((c) => c.docId === this.workCenterId);
    return wc?.data.name || '';
  }

  /** Apply a slot suggestion to the form */
  applySuggestion(suggestion: SlotSuggestion): void {
    this.form.patchValue({
      startDate: this.isoToNgbDate(suggestion.startDate),
      endDate: this.isoToNgbDate(suggestion.endDate),
    });
    this.overlapError = '';
    this.slotSuggestions = [];
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.overlapError = '';
    this.slotSuggestions = [];

    const formValue = this.form.value;
    const startIso = this.ngbDateToIso(formValue.startDate);
    const endIso = this.ngbDateToIso(formValue.endDate);

    const data = {
      name: formValue.name,
      workCenterId: this.workCenterId,
      status: formValue.status as WorkOrderStatus,
      startDate: startIso,
      endDate: endIso,
    };

    let result: { success: boolean; error?: string };

    if (this.mode === 'edit' && this.editingOrder) {
      result = this.workOrderService.updateWorkOrder(this.editingOrder.docId, data);
    } else {
      result = this.workOrderService.createWorkOrder(data);
    }

    if (result.success) {
      this.save.emit();
    } else {
      this.overlapError = result.error || 'An error occurred.';

      // Generate conflict resolution suggestions
      const startDate = new Date(startIso);
      const endDate = new Date(endIso);
      const durationDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / 86400000
      );
      this.slotSuggestions = this.workOrderService.findAvailableSlots(
        this.workCenterId,
        durationDays,
        startIso,
        this.editingOrder?.docId
      );

      this.cdr.markForCheck();
    }
  }

  onCancel(): void {
    const panel = this.elementRef.nativeElement.querySelector('.panel-container');
    if (panel) {
      gsap.to(panel, {
        x: '100%',
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => this.cancel.emit(),
      });
    } else {
      this.cancel.emit();
    }
  }

  hasError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && control.touched;
  }
}
