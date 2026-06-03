import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export interface CreateCompanyUserDto {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateCompanyUserDto {
  name?: string;
  email?: string;
  role?: Role;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Auth-internal ────────────────────────────────────────────────────────────

  async create(email: string, name: string, password: string): Promise<User> {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, name, password: hashed },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateRefreshToken(id: string, token: string | null): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken: token },
    });
  }

  // ── Admin-facing ─────────────────────────────────────────────────────────────

  findAllByCompany(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: USER_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async createCompanyUser(companyId: string, dto: CreateCompanyUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: dto.role,
        companyId,
      },
      select: USER_SELECT,
    });
  }

  async updateCompanyUser(
    companyId: string,
    id: string,
    dto: UpdateCompanyUserDto,
  ) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async toggleActive(companyId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: USER_SELECT,
    });
  }
}
