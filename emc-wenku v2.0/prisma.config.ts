import { defineConfig, env } from 'prisma/config'

try {
  process.loadEnvFile('.env')
} catch (error: any) {
  if (error.code !== 'ENOENT') throw error
}

export default defineConfig({
  schema: 'backend/prisma/schema.prisma',
  migrations: {
    path: 'backend/prisma/migrations',
    seed: 'ts-node --project backend/tsconfig.json backend/prisma/seed.ts',
  },
  datasource: { url: env('DATABASE_URL') },
})
