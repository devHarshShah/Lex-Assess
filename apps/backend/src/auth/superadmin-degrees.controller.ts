import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from './roles';

@Controller('superadmin/degrees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminDegreesController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  list() {
    return this.authService.listAllDegrees();
  }

  @Post()
  create(@Body() dto: CreateSpecializationDto) {
    return this.authService.createDegree(dto.name);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CreateSpecializationDto) {
    return this.authService.updateDegree(id, dto.name);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.deleteDegree(id);
  }
}
