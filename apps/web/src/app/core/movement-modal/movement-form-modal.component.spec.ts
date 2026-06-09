import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import type { Product } from '../models/product.models';
import type { Warehouse } from '../models/warehouse.models';
import { CsvExportService } from '../services/csv-export.service';
import { ProductsService } from '../services/products.service';
import { ScannerService } from '../services/scanner.service';
import { WarehousesService } from '../services/warehouses.service';
import {
  MovementFormModalComponent,
  MovementModalConfig,
} from './movement-form-modal.component';

const product: Product = {
  id: 'product-1',
  companyId: 'company-1',
  name: 'Widget',
  description: null,
  sku: 'W-1',
  barcode: '123456789',
  minStock: 5,
  imageUrl: null,
  category: null,
  brand: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const warehouse: Warehouse = {
  id: 'warehouse-1',
  name: 'Main warehouse',
  address: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  _count: { zones: 1 },
};

const receptionConfig: MovementModalConfig = {
  modalClass: 'modal--reception',
  icon: 'archive-outline',
  idPrefix: 'reception',
  title: 'Nueva Recepción',
  warehouseSectionLabel: 'Almacén de destino',
  locationLabel: 'Ubicación *',
  locationRequiredAlert: 'Selecciona una ubicación de destino',
  linesLabel: 'Líneas de recepción',
  notesPlaceholder: 'Albarán, referencia...',
  submitLabel: 'Registrar recepción',
  successTitle: 'Recepción registrada',
  csvFilename: 'recepcion',
  csvLocationHeader: 'Ubicación destino',
};

describe('MovementFormModalComponent', () => {
  let fixture: ComponentFixture<MovementFormModalComponent>;
  let component: MovementFormModalComponent;
  let productsService: { getAll: ReturnType<typeof vi.fn> };
  let warehousesService: { getAll: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    productsService = {
      getAll: vi.fn(() =>
        of({ data: [product], total: 1, page: 1, limit: 200 }),
      ),
    };
    warehousesService = {
      getAll: vi.fn(() => of([warehouse])),
    };

    TestBed.configureTestingModule({
      imports: [MovementFormModalComponent],
      providers: [
        { provide: ProductsService, useValue: productsService },
        { provide: WarehousesService, useValue: warehousesService },
        { provide: ScannerService, useValue: { scan: vi.fn() } },
        { provide: CsvExportService, useValue: { export: vi.fn() } },
      ],
    });

    fixture = TestBed.createComponent(MovementFormModalComponent);
    fixture.componentRef.setInput('config', receptionConfig);
    fixture.componentRef.setInput('saving', false);
    fixture.componentRef.setInput('formError', '');
    component = fixture.componentInstance;
  });

  it('loads products using the API limit supported by the backend', () => {
    fixture.detectChanges();

    expect(productsService.getAll).toHaveBeenCalledWith({ limit: 200 });
    expect(component.products()).toEqual([product]);
    expect(warehousesService.getAll).toHaveBeenCalled();
    expect(component.warehouses()).toEqual([warehouse]);
  });

  it('does not submit without a location', () => {
    const emit = vi.spyOn(component.submitForm, 'emit');
    component.selectedWarehouseId = 'warehouse-1';
    component.lines = [{ productId: 'product-1', quantity: 2, notes: '' }];

    component.submit();

    expect(component.submitted).toBe(true);
    expect(emit).not.toHaveBeenCalled();
  });

  it('emits a generic movement payload when the form is valid', () => {
    const emit = vi.spyOn(component.submitForm, 'emit');
    component.selectedWarehouseId = 'warehouse-1';
    component.selectedLocationId = 'location-1';
    component.lines = [
      { productId: 'product-1', quantity: 2, notes: 'Restock' },
    ];

    component.submit();

    expect(emit).toHaveBeenCalledWith({
      warehouseId: 'warehouse-1',
      locationId: 'location-1',
      lines: [{ productId: 'product-1', quantity: 2, notes: 'Restock' }],
    });
  });
});
