import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const base = `${environment.apiUrl}/products`;
  let service: ProductsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists without query params when no filters are set', () => {
    service.getAll().subscribe();

    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ data: [], total: 0, page: 1, limit: 10 });
  });

  it('maps every filter into query params', () => {
    service
      .getAll({
        search: 'air',
        categoryId: 'cat-1',
        brandId: 'brand-1',
        lowStock: true,
        page: 2,
        limit: 10,
      })
      .subscribe();

    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.get('search')).toBe('air');
    expect(req.request.params.get('categoryId')).toBe('cat-1');
    expect(req.request.params.get('brandId')).toBe('brand-1');
    expect(req.request.params.get('lowStock')).toBe('true');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ data: [], total: 0, page: 2, limit: 10 });
  });

  it('still sends lowStock when it is explicitly false', () => {
    service.getAll({ lowStock: false }).subscribe();

    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.get('lowStock')).toBe('false');
    req.flush({ data: [], total: 0, page: 1, limit: 10 });
  });

  it('uploads the image as multipart form data under "file"', () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    service.uploadImage('p-1', file).subscribe();

    const req = http.expectOne(`${base}/p-1/image`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush({});
  });
});
