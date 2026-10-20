import { PrismaClient } from '@prisma/client'
try {
  process.loadEnvFile('.env')
} catch (error: any) {
  if (error.code !== 'ENOENT') throw error
}

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
const periods = [
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

async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('拒绝在生产环境运行初始化脚本。')
  const databaseName = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
    : ''
  if (!/(?:_dev|_test)$/.test(databaseName))
    throw new Error('种子脚本只允许连接名称以 _dev 或 _test 结尾的数据库。')
  for (const [index, name] of categories.entries())
    await prisma.category.upsert({
      where: { code: String(index + 1).padStart(2, '0') },
      update: { name, sortOrder: index + 1 },
      create: { code: String(index + 1).padStart(2, '0'), name, sortOrder: index + 1 },
    })
  for (const [index, name] of periods.entries())
    await prisma.period.upsert({
      where: { code: String(index + 1).padStart(2, '0') },
      update: { name, sortOrder: index + 1 },
      create: { code: String(index + 1).padStart(2, '0'), name, sortOrder: index + 1 },
    })
  for (const [code, name] of [
    ['M01', '收录计划'],
    ['M02', '编目与断代'],
    ['M03', '审核与收录'],
    ['M04', '网站制度'],
    ['M05', '数据与保存'],
    ['M06', '修订与公告'],
  ]) {
    await prisma.metaDocumentCategory.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    })
  }
  const category = await prisma.category.findUniqueOrThrow({ where: { code: '01' } })
  const period = await prisma.period.findUniqueOrThrow({ where: { code: '08' } })
  const testDocument = {
    title: '【开发测试】文献投稿与发布流程验证',
    authorName: '文库开发测试数据',
    categoryId: category.id,
    periodId: period.id,
    summary: '纯虚构的测试记录，用于本地检查目录、详情、分类、收藏和版本展示。',
    content:
      '这是明确标记为虚构的开发测试文献，不对应任何真实历史事件或玩家文件。\n\n开发、审核流程验证完成后，可在本地开发数据库删除此记录。',
    sourceDescription: '虚构内容；仅限 _dev 或 _test 数据库，不是正式馆藏。',
    sourceUrl: null,
    createdAtSource: '测试数据',
  }
  await prisma.literature.upsert({
    where: { publicCode: 'TEST-EMC-000001' },
    update: {},
    create: {
      ...testDocument,
      publicCode: 'TEST-EMC-000001',
      publishedAt: new Date(),
      versions: {
        create: {
          version: 1,
          title: testDocument.title,
          authorName: testDocument.authorName,
          summary: testDocument.summary,
          content: testDocument.content,
          snapshot: testDocument,
          changeNote: '仅供开发验证',
          createdById: null,
        },
      },
    },
  })
  console.log('分类、时期和 1 篇标注清楚的虚构测试文献已就绪。未创建测试用户或默认管理员。')
}

seed().finally(() => prisma.$disconnect())
