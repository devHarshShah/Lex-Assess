import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { ApiTokensService } from './api-tokens.service';

export class CreateApiTokenDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  /** Admin or superadmin the token acts as; defaults to the issuing superadmin. */
  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}

@Controller('superadmin/api-tokens')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class ApiTokensController {
  constructor(private readonly apiTokens: ApiTokensService) {}

  @Get()
  list() {
    return this.apiTokens.list();
  }

  @Post()
  create(@Req() req: { user: { id: string } }, @Body() dto: CreateApiTokenDto) {
    return this.apiTokens.create(req.user.id, dto);
  }

  @Delete(':id')
  revoke(@Param('id') id: string) {
    return this.apiTokens.revoke(id);
  }
}
