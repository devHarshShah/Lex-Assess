import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { RankingService } from './ranking.service';

@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('leaderboard')
  async leaderboard(@Query('limit') limit?: string) {
    const all = await this.rankingService.computeGlobalRanking();
    const parsedLimit = limit ? Number(limit) : undefined;
    const sliced = parsedLimit && parsedLimit > 0 ? all.slice(0, parsedLimit) : all;
    return sliced.map((entry) => ({
      rank: entry.rank,
      anonymizedId: entry.anonymizedId,
      practiceArea: entry.practiceArea,
    }));
  }

  @Get('leaderboard/full')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listFull() {
    return this.rankingService.computeGlobalRanking();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: { sub: string } }) {
    return this.rankingService.getStudentRank(req.user.sub);
  }
}
