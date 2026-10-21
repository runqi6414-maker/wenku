import { PrismaClient } from '@prisma/client'

try {
  process.loadEnvFile('.env')
} catch (error: any) {
  if (error.code !== 'ENOENT') throw error
}

const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
  : ''
if (process.env.NODE_ENV !== 'production')
  throw new Error('生产分类初始化脚本要求 NODE_ENV=production。')
if (!databaseName || /(?:_dev|_test)$/i.test(databaseName))
  throw new Error('拒绝连接开发或测试数据库；请使用独立的生产数据库名。')

const prisma = new PrismaClient()
const categories = [
  '教程攻略',
  '报刊杂志',
  '历史传记',
  '政论文书',
  '规则制度',
  '文艺创作',
  '数据统计',
  '声像资料',
]
const politicalSubcategories = [
  '【Nova】早期拓荒与社群形成',
  '【Aurora】开荒与建国',
  '【Aurora】明联邦秩序',
  '【Aurora】大滇崛起与护国战争',
  '【Aurora】华夏联盟与抗韩战争',
  '【Aurora】中华合众国统合',
  '【Aurora】周目末期与多极化',
  '【Nostra】周目初开与建国潮',
  '【Nostra】中日战争',
  '【Nostra】多极竞争',
]
const metaCategories = [
  ['M01', '收录计划'],
  ['M02', '编目与断代'],
  ['M03', '审核与收录'],
  ['M04', '网站制度'],
  ['M05', '数据与保存'],
  ['M06', '修订与公告'],
]

async function initializeTaxonomy() {
  await prisma.$transaction(async (tx) => {
    for (const [index, name] of categories.entries()) {
      await tx.category.upsert({
        where: { code: String(index + 1).padStart(2, '0') },
        update: { name, sortOrder: index + 1 },
        create: { code: String(index + 1).padStart(2, '0'), name, sortOrder: index + 1 },
      })
    }
    const politicalCategory = await tx.category.findUniqueOrThrow({ where: { code: '04' } })
    for (const [index, name] of politicalSubcategories.entries()) {
      await tx.subcategory.upsert({
        where: {
          parentCategoryId_code: {
            parentCategoryId: politicalCategory.id,
            code: String(index + 1).padStart(2, '0'),
          },
        },
        update: { name, sortOrder: index + 1 },
        create: {
          parentCategoryId: politicalCategory.id,
          code: String(index + 1).padStart(2, '0'),
          name,
          sortOrder: index + 1,
        },
      })
    }
    for (const [code, name] of metaCategories) {
      await tx.metaDocumentCategory.upsert({
        where: { code },
        update: { name },
        create: { code, name },
      })
    }
  })
  console.log('生产分类已初始化。未创建文献、投稿、用户或管理员。')
}

initializeTaxonomy()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
