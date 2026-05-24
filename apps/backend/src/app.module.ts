import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { QuestionPapersModule } from './question-papers/question-papers.module';

@Module({
  imports: [AuthModule, QuestionPapersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
