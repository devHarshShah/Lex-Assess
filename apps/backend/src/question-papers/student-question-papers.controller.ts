import { Controller, Get, Post, UseGuards, Req, Param, Body } from '@nestjs/common';
import { QuestionPapersService, SubmitAttemptDto } from './question-papers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('student/papers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
export class StudentQuestionPapersController {
  constructor(private readonly service: QuestionPapersService) {}

  @Get()
  getPapers(@Req() req: { user: { sub: string } }) {
    return this.service.getPublishedPapersForStudent(req.user.sub);
  }

  @Post(':versionId/start')
  async startAttempt(
    @Param('versionId') versionId: string,
    @Req() req: { user: { sub: string } },
  ) {
    const attempt = await this.service.startAttempt(versionId, req.user.sub);
    // Lets the client correct for a skewed local clock when computing the deadline.
    return { ...attempt, serverNow: new Date() };
  }

  @Post(':versionId/submit')
  submitAttempt(
    @Param('versionId') versionId: string,
    @Body() data: SubmitAttemptDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.service.submitAttempt(versionId, req.user.sub, data);
  }

  @Get(':versionId/status')
  getAttemptStatus(
    @Param('versionId') versionId: string,
    @Req() req: { user: { sub: string } },
  ) {
    return this.service.getAttemptStatus(versionId, req.user.sub);
  }

  @Post(':versionId/save-answers')
  saveAnswers(
    @Param('versionId') versionId: string,
    @Body() data: SubmitAttemptDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.service.saveAnswers(versionId, req.user.sub, data);
  }

  @Get(':versionId/details')
  getVersionDetails(@Param('versionId') versionId: string) {
    return this.service.getStudentVersionDetails(versionId);
  }
}
