import { createPrismaMock, PrismaMock, row } from '../testing/prisma-mock';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let prisma: PrismaMock;
  let service: DashboardService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new DashboardService(prisma);
  });

  it('builds KPIs and alerts from SQL aggregates scoped to the company', async () => {
    prisma.product.count.mockResolvedValue(30);
    prisma.stockMovement.count.mockResolvedValue(4);
    prisma.stockMovement.findMany.mockResolvedValue(
      row([
        {
          id: 'movement-1',
          type: 'INBOUND',
          quantity: 5,
          createdAt: new Date('2026-06-09T10:00:00Z'),
          product: { name: 'Widget', sku: 'W-1' },
          warehouse: { name: 'Central' },
        },
      ]),
    );
    prisma.$queryRaw
      .mockResolvedValueOnce(
        row([
          {
            id: 'p-empty',
            name: 'Empty',
            sku: 'E-1',
            minStock: 3,
            totalStock: 0,
          },
          { id: 'p-low', name: 'Low', sku: 'L-1', minStock: 5, totalStock: 2 },
        ]),
      )
      .mockResolvedValueOnce(row([{ lowStock: 6, noStock: 2 }]));

    await expect(service.getStats('company-1')).resolves.toEqual({
      kpis: { totalProducts: 30, lowStock: 6, noStock: 2, movementsToday: 4 },
      alerts: [
        {
          id: 'p-empty',
          productName: 'Empty',
          sku: 'E-1',
          totalStock: 0,
          minStock: 3,
          type: 'no-stock',
        },
        {
          id: 'p-low',
          productName: 'Low',
          sku: 'L-1',
          totalStock: 2,
          minStock: 5,
          type: 'low-stock',
        },
      ],
      recentMovements: [
        {
          id: 'movement-1',
          type: 'INBOUND',
          quantity: 5,
          productName: 'Widget',
          warehouseName: 'Central',
          createdAt: new Date('2026-06-09T10:00:00Z'),
        },
      ],
    });

    expect(prisma.product.count).toHaveBeenCalledWith({
      where: { companyId: 'company-1', isActive: true },
    });
    // The alert page and the KPI counters both run in the database.
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });

  it('defaults the low/no-stock counters when the tenant has no alert rows', async () => {
    prisma.product.count.mockResolvedValue(0);
    prisma.stockMovement.count.mockResolvedValue(0);
    prisma.stockMovement.findMany.mockResolvedValue(row([]));
    prisma.$queryRaw
      .mockResolvedValueOnce(row([]))
      .mockResolvedValueOnce(row([]));

    const stats = await service.getStats('company-1');

    expect(stats.kpis).toEqual({
      totalProducts: 0,
      lowStock: 0,
      noStock: 0,
      movementsToday: 0,
    });
    expect(stats.alerts).toEqual([]);
  });
});
