import 'reflect-metadata'
try {
  process.loadEnvFile('.env')
} catch (error: any) {
  if (error.code !== 'ENOENT') throw error
}
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
  app.use((req: any, res: any, next: () => void) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== frontendOrigin
    ) {
      return res
        .status(403)
        .json({ error: { code: 'ORIGIN_NOT_ALLOWED', message: '请求来源不被允许' } })
    }
    next()
  })
  const windows = new Map<string, { count: number; expiresAt: number }>()
  app.use((req: any, res: any, next: () => void) => {
    const pathname = req.path ?? ''
    const policy =
      pathname === '/api/v1/auth/login'
        ? { limit: 10, duration: 15 * 60_000 }
        : pathname === '/api/v1/auth/register'
          ? { limit: 5, duration: 60 * 60_000 }
          : pathname === '/api/v1/submissions' && req.method === 'POST'
            ? { limit: 10, duration: 60 * 60_000 }
            : null
    if (!policy) return next()
    const key = `${req.ip ?? req.socket.remoteAddress}:${pathname}`
    const now = Date.now()
    let window = windows.get(key)
    if (!window || window.expiresAt <= now) {
      window = { count: 0, expiresAt: now + policy.duration }
      windows.set(key, window)
    }
    window.count += 1
    if (window.count > policy.limit) {
      res.setHeader('Retry-After', String(Math.ceil((window.expiresAt - now) / 1000)))
      return res.status(429).json({ statusCode: 429, message: '操作过于频繁，请稍后重试。' })
    }
    next()
  })
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  )
  app.enableShutdownHooks()
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0')
}

bootstrap()
