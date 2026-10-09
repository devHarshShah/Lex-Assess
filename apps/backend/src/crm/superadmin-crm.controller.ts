import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { CrmService } from './crm.service';
import type { LeadQuery, LogActivityInput, UpdateLeadInput } from './crm.types';

@Controller('superadmin/crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminCrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('meta')
  meta() {
    return this.crm.getMeta();
  }

  @Get('leads')
  list(@Query() q: LeadQuery) {
    return this.crm.listLeads(q);
  }

  @Get('leads.xlsx')
  @Header('Cache-Control', 'no-store')
  async export(@Query() q: LeadQuery, @Res() res: Response) {
    const buffer = await this.crm.buildWorkbook(q);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="lexassess-crm-leads.xlsx"');
    res.send(buffer);
  }

  @Get('leads/:userId')
  get(@Param('userId') userId: string) {
    return this.crm.getLead(userId);
  }

  @Patch('leads/:userId')
  update(@Request() req: any, @Param('userId') userId: string, @Body() body: UpdateLeadInput) {
    return this.crm.updateLead(userId, req.user.id, body ?? {});
  }

  @Post('leads/:userId/activities')
  @HttpCode(HttpStatus.CREATED)
  log(@Request() req: any, @Param('userId') userId: string, @Body() body: LogActivityInput) {
    return this.crm.logActivity(userId, req.user.id, body ?? {});
  }
}
