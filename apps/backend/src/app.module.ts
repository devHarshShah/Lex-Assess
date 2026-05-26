import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { QuestionPapersModule } from './question-papers/question-papers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    QuestionPapersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
