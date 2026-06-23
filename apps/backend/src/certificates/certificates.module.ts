import { Module } from '@nestjs/common';
import { StorageModule } from '../common/storage.module';
import { PrismaService } from '../prisma/prisma.service';
import { RankingService } from '../ranking/ranking.service';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [StorageModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, RankingService, PrismaService],
})
export class CertificatesModule {}
