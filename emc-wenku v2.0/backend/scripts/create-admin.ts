import { PrismaClient, UserRole } from '@prisma/client'
import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>
try {
  process.loadEnvFile('.env')
} catch (error: any) {
  if (error.code !== 'ENOENT') throw error
}
const [username, email] = process.argv.slice(2)
const password = process.env.ADMIN_PASSWORD ?? ''
if (!username || !email || password.length < 12)
  throw new Error(
    '用法: 设置 ADMIN_PASSWORD（至少12位）后运行 npm run admin:create -- <用户名> <邮箱>',
  )

const prisma = new PrismaClient()
async function createAdmin() {
  const salt = randomBytes(16).toString('hex')
  const passwordHash = `scrypt$${salt}$${(await scrypt(password, salt, 64)).toString('hex')}`
  await prisma.user.upsert({
    where: { username },
    update: { role: UserRole.ADMIN, status: 'ACTIVE' },
    create: { username, email, passwordHash, role: UserRole.ADMIN },
  })
  console.log(`管理员 ${username} 已创建或更新。`)
}
createAdmin().finally(() => prisma.$disconnect())
