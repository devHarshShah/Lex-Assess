import { Controller, Get, Param, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { QuestionPapersService, UpdateScoreDto } from './question-papers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN, Role.ADMIN)
export class SubmissionsController {
  constructor(private readonly service: QuestionPapersService) {}

  @Get('summary')
  getSubmissionsSummary() {
    return this.service.getSubmissionsSummary();
  }

  @Get('specialization/:specializationId')
  getSubmissionsBySpecialization(@Param('specializationId') specializationId: string) {
    return this.service.getSubmissionsBySpecialization(specializationId);
  }

  @Get(':id')
  getSubmissionDetails(@Param('id') id: string) {
    return this.service.getSubmissionDetails(id);
  }

  @Patch(':id/score')
  updateSubmissionScore(
    @Param('id') id: string,
    @Body() data: UpdateScoreDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.service.updateSubmissionScore(id, data, req.user.sub);
  }
}
