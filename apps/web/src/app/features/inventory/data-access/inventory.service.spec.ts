import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { InventoryService } from './inventory.service';

describe('InventoryService (data-access)', () => {
  const base = `${environment.apiUrl}/inventory`;
  let service: InventoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InventoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps the list query into params and omits unset filters', () => {
    service.getAll({ page: 3, limit: 20, status: 'IN_PROGRESS' }).subscribe();

    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('status')).toBe('IN_PROGRESS');
    expect(req.request.params.has('warehouseId')).toBe(false);
    req.flush({ data: [], total: 0, page: 3, limit: 20 });
  });

  it('drives the count lifecycle through start/complete/cancel endpoints', () => {
    service.start('c-1').subscribe();
    http.expectOne(`${base}/c-1/start`).flush({});

    service.complete('c-1').subscribe();
    http.expectOne(`${base}/c-1/complete`).flush({});

    service.cancel('c-1').subscribe();
    const cancelReq = http.expectOne(`${base}/c-1/cancel`);
    expect(cancelReq.request.method).toBe('PATCH');
    expect(cancelReq.request.body).toEqual({});
    cancelReq.flush({});
  });

  it('registers a counted quantity through the line endpoint', () => {
    service.updateLine('c-1', 'l-1', 7).subscribe();

    const req = http.expectOne(`${base}/c-1/lines/l-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ countedQty: 7 });
    req.flush({});
  });
});
