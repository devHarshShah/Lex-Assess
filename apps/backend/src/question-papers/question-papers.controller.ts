import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { QuestionPapersService, CreatePaperDto, UpdatePaperDto, CreateVersionDto, UpdateVersionDto, UpdateVersionNameDto } from './question-papers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/specializations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN, Role.ADMIN)
export class QuestionPapersController {
  constructor(private readonly service: QuestionPapersService) {}

  @Get('all-papers')
  @Roles(Role.SUPERADMIN)
  getAllPapers() {
    return this.service.getAllPapers();
  }

  @Get(':specializationId/papers')
  getPapers(@Param('specializationId') specializationId: string) {
    return this.service.getPapersBySpecialization(specializationId);
  }

  @Post(':specializationId/papers')
  createPaper(
    @Param('specializationId') specializationId: string,
    @Body() data: CreatePaperDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.service.createPaper(specializationId, data, req.user.sub);
  }

  @Put(':specializationId/papers/:paperId')
  updatePaper(@Param('paperId') paperId: string, @Body() data: UpdatePaperDto) {
    return this.service.updatePaper(paperId, data);
  }

  @Delete(':specializationId/papers/:paperId')
  deletePaper(@Param('paperId') paperId: string) {
    return this.service.deletePaper(paperId);
  }

  @Get('papers/:paperId/versions')
  getVersions(@Param('paperId') paperId: string) {
    return this.service.getVersions(paperId);
  }

  @Post('papers/:paperId/versions')
  createVersion(@Param('paperId') paperId: string, @Body() data: CreateVersionDto) {
    return this.service.createVersion(paperId, data);
  }

  @Get('versions/:versionId')
  getVersionDetails(@Param('versionId') versionId: string) {
    return this.service.getVersionDetails(versionId);
  }

  @Put('versions/:versionId/rename')
  updateVersionName(@Param('versionId') versionId: string, @Body() data: UpdateVersionNameDto) {
    return this.service.updateVersionName(versionId, data);
  }

  @Put('versions/:versionId')
  updateVersion(@Param('versionId') versionId: string, @Body() data: UpdateVersionDto) {
    return this.service.updateVersion(versionId, data);
  }

  @Delete('versions/:versionId')
  deleteVersion(@Param('versionId') versionId: string) {
    return this.service.deleteVersion(versionId);
  }
}

