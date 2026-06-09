import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';

export type PrismaMock = DeepMockProxy<PrismaService>;

/**
 * Fully-typed deep mock of `PrismaService` for service unit tests. Every model
 * delegate (`prisma.product.findFirst`, …) is an auto-typed `jest.fn()`, so
 * tests get autocomplete and type-checked arguments without hand-listing
 * methods or casting through `any`.
 *
 * Interactive transactions are wired to run the callback against the same mock,
 * so service code that wraps writes in `$transaction(cb)` exercises the mocked
 * delegates exactly as it would against a real client.
 */
export function createPrismaMock(): PrismaMock {
  const prisma = mockDeep<PrismaService>();

  (prisma.$transaction as unknown as jest.Mock).mockImplementation(
    (arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: PrismaMock) => unknown)(prisma)
        : Promise.all(arg as readonly unknown[]),
  );

  return prisma;
}

/**
 * Casts a partial fixture to the full row a Prisma delegate resolves to, so a
 * typed `mockResolvedValue` accepts the minimal object a test actually asserts
 * on without spelling out every column (relations and arrays included). `T` is
 * inferred from the mock's return type at the call site, e.g.
 * `findFirst.mockResolvedValue(row({ id: 'x' }))`.
 *
 * The parameter is `unknown` on purpose: putting `T` inside the parameter type
 * makes TypeScript infer it from the fixture instead of from the mock's return
 * type, which defeats the inference. Test fixtures are deliberately minimal, so
 * forgoing shape-checking on the input here is an acceptable trade.
 */
export function row<T>(value: unknown): T {
  return value as T;
}
