import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard KPIs, alerts and recent movements' })
  getStats(@CompanyId() companyId: string) {
    return this.dashboard.getStats(companyId);
  }
}
