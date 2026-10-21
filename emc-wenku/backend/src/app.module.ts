import { Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { ApiController } from './api.controller'
import { ApiService } from './api.service'
import { AuthGuard, RolesGuard } from './security'
import { AttachmentsService } from './attachments.service'

@Module({
  controllers: [ApiController],
  providers: [PrismaService, ApiService, AttachmentsService, AuthGuard, RolesGuard],
})
export class AppModule {}
