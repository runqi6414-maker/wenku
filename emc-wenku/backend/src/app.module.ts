import { Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { ApiController } from './api.controller'
import { ApiService } from './api.service'
import { AuthGuard, RolesGuard } from './security'

@Module({
  controllers: [ApiController],
  providers: [PrismaService, ApiService, AuthGuard, RolesGuard],
})
export class AppModule {}
