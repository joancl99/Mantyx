import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

const COMPANY_SELECT = {
  id: true,
  name: true,
  slug: true,
  taxId: true,
  status: true,
  createdAt: true,
  _count: { select: { users: true, warehouses: true } },
};

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      select: COMPANY_SELECT,
    });
  }

  async create(dto: CreateCompanyDto) {
    const slug = this.slugify(dto.name);
    const exists = await this.prisma.company.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (exists)
      throw new ConflictException(`Ya existe una empresa con ese nombre`);

    const emailTaken = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (emailTaken) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

    // Create the company and its initial ADMIN atomically.
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: dto.name, slug, taxId: dto.taxId },
      });
      await tx.user.create({
        data: {
          name: dto.adminName,
          email: dto.adminEmail,
          password: hashedPassword,
          role: Role.ADMIN,
          companyId: company.id,
        },
      });
      return tx.company.findUnique({
        where: { id: company.id },
        select: COMPANY_SELECT,
      });
    });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    if (dto.name) {
      const conflict = await this.prisma.company.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (conflict)
        throw new ConflictException(`Ya existe una empresa con ese nombre`);
    }
    return this.prisma.company.update({
      where: { id },
      data: { name: dto.name, taxId: dto.taxId },
      select: COMPANY_SELECT,
    });
  }

  async toggleStatus(id: string) {
    const company = await this.findOne(id);
    const next: CompanyStatus =
      company.status === CompanyStatus.ACTIVE
        ? CompanyStatus.INACTIVE
        : CompanyStatus.ACTIVE;
    return this.prisma.company.update({
      where: { id },
      data: { status: next },
      select: COMPANY_SELECT,
    });
  }

  private async findOne(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException(`Empresa ${id} no encontrada`);
    return company;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
