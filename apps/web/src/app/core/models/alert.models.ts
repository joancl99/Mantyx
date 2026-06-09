export interface LowStockAlert {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
}
