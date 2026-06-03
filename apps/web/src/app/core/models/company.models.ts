export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  taxId: string | null;
  status: CompanyStatus;
  createdAt: string;
  _count: { users: number; warehouses: number };
}

export interface CreateCompanyDto {
  name: string;
  taxId?: string;
}
