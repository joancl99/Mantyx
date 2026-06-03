export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
}
