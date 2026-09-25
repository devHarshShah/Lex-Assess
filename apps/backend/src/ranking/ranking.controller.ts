import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { RankingService } from './ranking.service';

// Ranks are frozen snapshots published by an admin (RankingService.releaseRanks). Nothing here
// recomputes rank on request, so a rank only changes when a new release goes out. RolesGuard uses a
// role hierarchy, so @Roles(Role.ADMIN) also admits SUPERADMIN.
@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('leaderboard')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  leaderboard(@Query('limit') limit?: string) {
    return this.rankingService.getReleasedLeaderboard(limit ? Number(limit) : undefined);
  }

  @Get('leaderboard/full')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listFull() {
    return this.rankingService.getReleasedFullLeaderboard();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: { sub: string } }) {
    return this.rankingService.getMyStanding(req.user.sub);
  }

  @Get('releases')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  releases() {
    return this.rankingService.listReleases();
  }

  @Get('releases/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  preview() {
    return this.rankingService.getPreview();
  }

  @Post('releases')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  release(@Req() req: { user: { sub: string } }) {
    return this.rankingService.releaseRanks(req.user.sub);
  }
}
