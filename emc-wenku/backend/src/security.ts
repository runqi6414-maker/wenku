import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createHash } from 'node:crypto'
import { PrismaService } from './prisma.service'

export const Roles = (...roles: string[]) => SetMetadata('roles', roles)
export const CurrentUser = createParamDecorator(
  (_data, context: ExecutionContext) => context.switchToHttp().getRequest().user,
)

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest()
    const cookie = String(req.headers.cookie ?? '')
      .split(';')
      .map((part: string) => part.trim())
      .find((part: string) => part.startsWith('emc_session='))
    const token = cookie?.slice('emc_session='.length)
    if (!token) throw new UnauthorizedException('请先登录')
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash: createHash('sha256').update(decodeURIComponent(token)).digest('hex') },
      include: { user: true },
    })
    if (!session || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE')
      throw new UnauthorizedException('登录已失效')
    req.user = { id: session.user.id, username: session.user.username, role: session.user.role }
    req.sessionId = session.id
    return true
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ])
    if (!roles?.length) return true
    const user = context.switchToHttp().getRequest().user
    if (!user) throw new UnauthorizedException('请先登录')
    if (!roles.includes(user.role)) throw new ForbiddenException('无权执行此操作')
    return true
  }
}
