import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from './roles';

@Controller('superadmin/specializations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminSpecializationsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  list() {
    return this.authService.listAllSpecializations();
  }

  @Post()
  create(@Body() dto: CreateSpecializationDto) {
    return this.authService.createSpecialization(dto.name);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSpecializationDto) {
    return this.authService.updateSpecialization(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.deleteSpecialization(id);
  }
}
