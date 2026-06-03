export interface Category {
  id: string;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  minStock: number;
  imageUrl: string | null;
  category: Category | null;
  brand: Brand | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsQuery {
  search?: string;
  categoryId?: string;
  brandId?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  minStock: number;
  categoryId?: string;
  brandId?: string;
}
