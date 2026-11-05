import { Module } from '@nestjs/common';
import { StorageModule } from '../common/storage.module';
import { PrismaService } from '../prisma/prisma.service';
import { RankingModule } from '../ranking/ranking.module';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { SuperadminCertificatesController } from './superadmin-certificates.controller';

@Module({
  imports: [StorageModule, RankingModule],
  controllers: [CertificatesController, SuperadminCertificatesController],
  providers: [CertificatesService, PrismaService],
})
export class CertificatesModule {}
