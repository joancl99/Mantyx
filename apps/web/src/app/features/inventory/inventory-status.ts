import { InventoryCountStatus } from './models/inventory.models';

export const INVENTORY_STATUS_OPTIONS: { value: InventoryCountStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

export function inventoryStatusLabel(status: InventoryCountStatus) {
  return INVENTORY_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}
