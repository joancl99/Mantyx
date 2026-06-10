export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

export interface AuditUser {
  id: string;
  name: string;
  email: string;
}

export interface AuditEntry {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userId: string;
  user: AuditUser;
}

export interface AuditQuery {
  page?: number;
  limit?: number;
  action?: AuditAction;
  entityType?: string;
}

export interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  limit: number;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
};

export const AUDIT_ACTION_CLASS: Record<AuditAction, string> = {
  CREATE: 'action--create',
  UPDATE: 'action--update',
  DELETE: 'action--delete',
  LOGIN: 'action--login',
  LOGOUT: 'action--logout',
};

/** Entity types the backend writes audit entries for. */
export const AUDIT_ENTITY_TYPES: { value: string; label: string }[] = [
  { value: 'Auth', label: 'Sesiones' },
  { value: 'Product', label: 'Productos' },
  { value: 'User', label: 'Usuarios' },
  { value: 'StockMovement', label: 'Movimientos' },
  { value: 'InventoryCount', label: 'Inventarios' },
];
