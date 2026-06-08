import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CompanyCandidatesService } from './company-candidates.service';
import { ListCompanyCandidatesQueryDto } from './dto/list-company-candidates.query';
import { UpdateCompanyCandidateDto } from './dto/update-company-candidate.dto';

@Controller('company/candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.COMPANY)
export class CompanyCandidatesController {
  constructor(private readonly service: CompanyCandidatesService) {}

  @Get()
  listCandidates(@Req() req: { user: { sub: string } }, @Query() query: ListCompanyCandidatesQueryDto) {
    return this.service.listCandidates(req.user.sub, query);
  }

  @Patch(':attemptId')
  updateCandidateDecision(
    @Req() req: { user: { sub: string } },
    @Param('attemptId') attemptId: string,
    @Body() dto: UpdateCompanyCandidateDto,
  ) {
    return this.service.updateCandidateDecision(req.user.sub, attemptId, dto);
  }
}
