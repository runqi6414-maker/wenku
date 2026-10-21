import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { PrismaService } from './prisma.service'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>
const publicUser = (user: any) => ({ id: user.id, username: user.username, role: user.role })
const itemDto = (item: any) => ({
  id: item.id,
  publicCode: item.publicCode,
  title: item.title,
  author: item.authorName,
  category: item.category?.code,
  subcategory: item.subcategory?.code ?? '',
  summary: item.summary,
  content: item.content,
  views: Number(item.viewCount),
  date: item.publishedAt?.toISOString().slice(0, 10) ?? '',
  source: { description: item.sourceDescription, url: item.sourceUrl ?? '' },
  attachments: item.attachments?.map((file: any) => ({
    id: file.id,
    name: file.originalName,
    mediaType: file.mediaType,
    size: file.size,
  })),
  status: item.status,
})
const submissionDto = (item: any) => ({
  id: item.id,
  title: item.title,
  authorName: item.authorName,
  category: item.category?.code,
  subcategory: item.subcategory?.code ?? '',
  summary: item.summary,
  content: item.content,
  sourceDescription: item.sourceDescription,
  sourceUrl: item.sourceUrl ?? '',
  sourceDate: item.sourceDate ?? '',
  status: item.status.toLowerCase(),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  submittedAt: item.submittedAt,
  publishedLiteratureId: item.publishedLiteratureId,
  submitter: item.submitter ? publicUser(item.submitter) : undefined,
  attachments: item.attachments?.map((file: any) => ({
    id: file.id,
    name: file.originalName,
    mediaType: file.mediaType,
    size: file.size,
    createdAt: file.createdAt,
  })),
  reviews: item.reviews?.map((review: any) => ({
    comment: review.comment,
    status: review.toStatus.toLowerCase(),
    createdAt: review.createdAt,
    reviewer: review.reviewer.username,
  })),
})

@Injectable()
export class ApiService {
  constructor(private prisma: PrismaService) {}

  async register(body: any) {
    const username = String(body.username ?? '').trim()
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')
    if (!/^[\p{L}\p{N}_-]{3,32}$/u.test(username))
      throw new BadRequestException('用户名需为 3–32 位字母、数字、下划线或连字符')
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('请输入有效邮箱')
    if (password.length < 12 || password.length > 128)
      throw new BadRequestException('密码长度需为 12–128 个字符')
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ username }, { email }] } })
    if (existing) throw new ConflictException('用户名或邮箱已被注册')
    const user = await this.prisma.user.create({
      data: { username, email, passwordHash: await this.hashPassword(password) },
    })
    return this.startSession(user)
  }

  async login(body: any) {
    const login = String(body.username ?? '').trim()
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: login }, { email: login.toLowerCase() }] },
    })
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !(await this.verifyPassword(String(body.password ?? ''), user.passwordHash))
    )
      throw new UnauthorizedException('用户名或密码不正确')
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    return this.startSession(user)
  }

  async logout(sessionId: string) {
    await this.prisma.userSession.delete({ where: { id: sessionId } })
  }
  me(user: any) {
    return user
  }

  async categories() {
    return this.prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })
  }
  async subcategories(categoryCode = '04') {
    const parent = await this.prisma.category.findUnique({ where: { code: categoryCode } })
    if (!parent) throw new NotFoundException('文献分类不存在')
    return this.prisma.subcategory.findMany({
      where: { parentCategoryId: parent.id, active: true },
      orderBy: { sortOrder: 'asc' },
    })
  }

  async literature(query: any) {
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 12))
    const where: any = { status: 'PUBLISHED' }
    if (query.categoryId) where.category = { code: String(query.categoryId) }
    if (query.subcategoryId) {
      if (query.categoryId && String(query.categoryId) !== '04')
        throw new BadRequestException('十大分期仅适用于政论文书类文献')
      const subcategory = await this.prisma.subcategory.findFirst({
        where: { code: String(query.subcategoryId), parentCategory: { code: '04' }, active: true },
      })
      if (!subcategory) throw new BadRequestException('政论文书子分类无效')
      where.subcategoryId = subcategory.id
    }
    const keyword = String(query.keyword ?? '').trim()
    if (keyword)
      where.OR = ['title', 'authorName', 'summary', 'content', 'publicCode'].map((field) => ({
        [field]: { contains: keyword, mode: 'insensitive' },
      }))
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.literature.findMany({
        where,
        include: { category: true, subcategory: true },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.literature.count({ where }),
    ])
    return { items: rows.map(itemDto), total, page, pageSize }
  }

  async detail(id: string) {
    const item = await this.prisma.literature.findFirst({
      where: { OR: [{ id }, { publicCode: id }], status: 'PUBLISHED' },
      include: {
        category: true,
        subcategory: true,
        attachments: true,
        versions: {
          orderBy: { version: 'desc' },
          select: { version: true, changeNote: true, createdAt: true },
        },
      },
    })
    if (!item) throw new NotFoundException('文献不存在')
    await this.prisma.$transaction([
      this.prisma.pageViewEvent.create({ data: { literatureId: item.id } }),
      this.prisma.literature.update({
        where: { id: item.id },
        data: { viewCount: { increment: 1 } },
      }),
    ])
    return {
      ...itemDto({ ...item, viewCount: item.viewCount + BigInt(1) }),
      versions: item.versions,
    }
  }

  async homeOverview() {
    const [literatureCount, categoryCount, subcategoryCount, viewCount] = await Promise.all([
      this.prisma.literature.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.category.count({ where: { active: true } }),
      this.prisma.subcategory.count({ where: { active: true, parentCategory: { code: '04' } } }),
      this.prisma.literature.aggregate({
        where: { status: 'PUBLISHED' },
        _sum: { viewCount: true },
      }),
    ])
    return {
      literatureCount,
      categoryCount,
      subcategoryCount,
      viewCount: Number(viewCount._sum.viewCount ?? 0),
    }
  }

  async recentLiterature() {
    const rows = await this.prisma.literature.findMany({
      where: { status: 'PUBLISHED' },
      include: { category: true, subcategory: true },
      orderBy: { publishedAt: 'desc' },
      take: 6,
    })
    return rows.map(itemDto)
  }
  async popularLiterature() {
    const ranked = await this.prisma.$queryRaw<
      Array<{ literature_id: string }>
    >`SELECT literature_id FROM page_view_events WHERE occurred_at >= NOW() - INTERVAL '30 days' GROUP BY literature_id ORDER BY COUNT(*) DESC LIMIT 6`
    if (!ranked.length) return []
    const rows = await this.prisma.literature.findMany({
      where: { id: { in: ranked.map((item) => item.literature_id) }, status: 'PUBLISHED' },
      include: { category: true, subcategory: true },
    })
    const byId = new Map(rows.map((row) => [row.id, row]))
    return ranked.flatMap(({ literature_id }) => {
      const row = byId.get(literature_id)
      return row ? [itemDto(row)] : []
    })
  }

  async createSubmission(user: any, body: any) {
    const category = await this.prisma.category.findUnique({
      where: { code: String(body.category ?? '') },
    })
    if (!category) throw new BadRequestException('文献分类无效')
    const subcategoryId = await this.resolveSubcategory(category.id, body.subcategory)
    const data = this.submissionData(body, category.id, subcategoryId)
    return submissionDto(
      await this.prisma.$transaction(async (tx) => {
        const submission = await tx.submission.create({ data: { ...data, submitterId: user.id } })
        await tx.submissionVersion.create({
          data: {
            submissionId: submission.id,
            version: 1,
            snapshot: data,
            changeNote: '创建草稿',
            createdById: user.id,
          },
        })
        return tx.submission.findUnique({
          where: { id: submission.id },
          include: { category: true, subcategory: true, attachments: true },
        })
      }),
    )
  }

  async mySubmissions(user: any) {
    const rows = await this.prisma.submission.findMany({
      where: { submitterId: user.id },
      include: {
        category: true,
        subcategory: true,
        attachments: true,
        reviews: { include: { reviewer: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map(submissionDto)
  }

  async submission(id: string, user: any, reviewer = false) {
    const row = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        attachments: true,
        submitter: true,
        reviews: { include: { reviewer: true }, orderBy: { createdAt: 'desc' } },
        versions: { orderBy: { version: 'desc' } },
      },
    })
    if (!row || (!reviewer && row.submitterId !== user.id))
      throw new NotFoundException('投稿不存在')
    return { ...submissionDto(row), versions: row.versions }
  }

  async updateSubmission(id: string, user: any, body: any) {
    const current = await this.prisma.submission.findUnique({ where: { id } })
    if (!current || current.submitterId !== user.id) throw new NotFoundException('投稿不存在')
    if (!['DRAFT', 'REVISION_REQUESTED'].includes(current.status))
      throw new BadRequestException('当前状态不允许修改')
    const category = await this.prisma.category.findUnique({
      where: { code: String(body.category ?? '') },
    })
    if (!category) throw new BadRequestException('文献分类无效')
    const subcategoryId = await this.resolveSubcategory(category.id, body.subcategory)
    const data = this.submissionData(body, category.id, subcategoryId)
    return this.saveSubmissionVersion(id, user.id, data, String(body.changeNote ?? '修改投稿'))
  }

  async submitSubmission(id: string, user: any, declarationAccepted: boolean) {
    const current = await this.prisma.submission.findUnique({ where: { id } })
    if (!current || current.submitterId !== user.id) throw new NotFoundException('投稿不存在')
    if (!['DRAFT', 'REVISION_REQUESTED'].includes(current.status))
      throw new BadRequestException('当前状态不允许提交审核')
    if (!declarationAccepted) throw new BadRequestException('请先确认投稿声明')
    const attachmentCount = await this.prisma.literatureAttachment.count({ where: { submissionId: id } })
    if (!current.title || !current.authorName || (!current.content && !attachmentCount) || !current.sourceDescription)
      throw new BadRequestException('标题、作者、正文或至少一个附件、来源说明为必填项')
    const updated = await this.prisma.submission.update({
      where: { id },
      data: { status: 'PENDING', submittedAt: new Date(), declarationAcceptedAt: new Date() },
      include: { category: true, subcategory: true },
    })
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'SUBMISSION_SUBMITTED',
        entityType: 'submission',
        entityId: id,
      },
    })
    return submissionDto(updated)
  }

  async withdrawSubmission(id: string, user: any) {
    const current = await this.prisma.submission.findUnique({ where: { id } })
    if (!current || current.submitterId !== user.id) throw new NotFoundException('投稿不存在')
    if (!['PENDING', 'REVISION_REQUESTED', 'DRAFT'].includes(current.status))
      throw new BadRequestException('当前状态不允许撤回')
    return submissionDto(
      await this.prisma.submission.update({
        where: { id },
        data: { status: 'WITHDRAWN' },
        include: { category: true, subcategory: true },
      }),
    )
  }

  async reviewQueue(status?: string) {
    const allowed = [
      'PENDING',
      'IN_REVIEW',
      'REVISION_REQUESTED',
      'APPROVED',
      'REJECTED',
      'PUBLISHED',
    ]
    const where: any = {
      status:
        status && allowed.includes(status.toUpperCase())
          ? status.toUpperCase()
          : { in: ['PENDING', 'IN_REVIEW'] },
    }
    return (
      await this.prisma.submission.findMany({
        where,
        include: { category: true, subcategory: true, submitter: true, attachments: true },
        orderBy: { submittedAt: 'asc' },
      })
    ).map((row) => ({
      ...submissionDto(row),
      status: row.status,
      summary: row.summary,
      content: row.content,
      sourceDescription: row.sourceDescription,
      sourceUrl: row.sourceUrl,
    }))
  }

  async adminLiterature(query: any) {
    const allowed = ['PUBLISHED', 'WITHDRAWN', 'HIDDEN']
    const status = String(query.status ?? 'PUBLISHED').toUpperCase()
    const where: any = allowed.includes(status) ? { status } : {}
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50))
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.literature.findMany({
        where,
        include: { category: true, subcategory: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.literature.count({ where }),
    ])
    return { items: rows.map(itemDto), total, page, pageSize }
  }

  async reviseLiterature(id: string, actor: any, body: any) {
    const current = await this.prisma.literature.findUnique({
      where: { id },
      include: { category: true, subcategory: true },
    })
    if (!current) throw new NotFoundException('文献不存在')
    const category = await this.prisma.category.findUnique({
      where: { code: String(body.category ?? '') },
    })
    if (!category) throw new BadRequestException('文献分类无效')
    const subcategoryId = await this.resolveSubcategory(category.id, body.subcategory)
    const data = this.submissionData(body, category.id, subcategoryId)
    const changeNote = String(body.changeNote ?? '').trim()
    if (!changeNote) throw new BadRequestException('修订正式文献时必须填写修订说明')
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.literatureVersion.findFirst({
        where: { literatureId: id },
        orderBy: { version: 'desc' },
      })
      const { sourceDate, ...recordData } = data
      const updated = await tx.literature.update({
        where: { id },
        data: { ...recordData, createdAtSource: sourceDate },
        include: { category: true, subcategory: true },
      })
      await tx.literatureVersion.create({
        data: {
          literatureId: id,
          version: (latest?.version ?? 0) + 1,
          title: data.title,
          authorName: data.authorName,
          summary: data.summary,
          content: data.content,
          snapshot: { ...data },
          changeNote,
          createdById: actor.id,
        },
      })
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'LITERATURE_REVISED',
          entityType: 'literature',
          entityId: id,
          details: { changeNote },
        },
      })
      return itemDto(updated)
    })
  }

  async setLiteratureStatus(id: string, actor: any, status: string) {
    if (!['PUBLISHED', 'WITHDRAWN', 'HIDDEN'].includes(status))
      throw new BadRequestException('文献状态无效')
    const item = await this.prisma.literature.update({
      where: { id },
      data: { status: status as any },
    })
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: `LITERATURE_${status}`,
        entityType: 'literature',
        entityId: id,
      },
    })
    return { id: item.id, publicCode: item.publicCode, status: item.status }
  }

  async review(id: string, reviewer: any, body: any) {
    const action = String(body.action ?? '')
    const target = (
      {
        start: 'IN_REVIEW',
        return: 'REVISION_REQUESTED',
        reject: 'REJECTED',
        approve: 'APPROVED',
      } as any
    )[action]
    if (!target) throw new BadRequestException('审核操作无效')
    const comment = String(body.comment ?? '').trim()
    if (['return', 'reject'].includes(action) && !comment)
      throw new BadRequestException('退回或拒绝时必须填写审核意见')
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.submission.findUnique({
        where: { id },
        include: { category: true, subcategory: true },
      })
      if (!current) throw new NotFoundException('投稿不存在')
      if (!['PENDING', 'IN_REVIEW'].includes(current.status))
        throw new BadRequestException('该稿件已被处理或当前状态不允许审核')
      const updated = await tx.submission.update({
        where: { id },
        data: { status: target, reviewerId: reviewer.id, reviewedAt: new Date() },
        include: { category: true, subcategory: true },
      })
      await tx.reviewRecord.create({
        data: {
          submissionId: id,
          reviewerId: reviewer.id,
          fromStatus: current.status,
          toStatus: target,
          comment,
          isFinal: ['REJECTED', 'APPROVED'].includes(target),
        },
      })
      await tx.auditLog.create({
        data: {
          actorId: reviewer.id,
          action: `REVIEW_${action.toUpperCase()}`,
          entityType: 'submission',
          entityId: id,
        },
      })
      return submissionDto(updated)
    })
  }

  async publish(id: string, admin: any) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.submission.findUnique({
        where: { id },
        include: { category: true, subcategory: true },
      })
      if (!row || row.status !== 'APPROVED')
        throw new BadRequestException('仅审核通过的投稿可以发布')
      const count = await tx.literature.count()
      const literature = await tx.literature.create({
        data: {
          publicCode: `EMC-${String(count + 1).padStart(6, '0')}`,
          title: row.title,
          authorName: row.authorName,
          categoryId: row.categoryId,
          subcategoryId: row.subcategoryId,
          summary: row.summary,
          content: row.content,
          sourceDescription: row.sourceDescription,
          sourceUrl: row.sourceUrl,
          createdAtSource: row.sourceDate,
          publishedAt: new Date(),
          versions: {
            create: {
              version: 1,
              title: row.title,
              authorName: row.authorName,
              summary: row.summary,
              content: row.content,
              snapshot: {
                title: row.title,
                authorName: row.authorName,
                categoryId: row.categoryId,
                subcategoryId: row.subcategoryId,
                summary: row.summary,
                content: row.content,
                sourceDescription: row.sourceDescription,
                sourceUrl: row.sourceUrl,
                sourceDate: row.sourceDate,
              },
              changeNote: '初次收录',
              createdById: admin.id,
            },
          },
        },
      })
      const updated = await tx.submission.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedLiteratureId: literature.id },
      })
      await tx.literatureAttachment.updateMany({
        where: { submissionId: id },
        data: { literatureId: literature.id },
      })
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: 'LITERATURE_PUBLISHED',
          entityType: 'literature',
          entityId: literature.id,
          details: { submissionId: id, publicCode: literature.publicCode },
        },
      })
      return { id: updated.id, literatureId: literature.id, publicCode: literature.publicCode }
    })
  }

  async favorites(user: any) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId: user.id, literature: { status: 'PUBLISHED' } },
      include: { literature: { include: { category: true, subcategory: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => itemDto(row.literature))
  }
  async toggleFavorite(user: any, id: string) {
    const literature = await this.prisma.literature.findFirst({
      where: { OR: [{ id }, { publicCode: id }], status: 'PUBLISHED' },
    })
    if (!literature) throw new NotFoundException('文献不存在')
    const key = { userId_literatureId: { userId: user.id, literatureId: literature.id } }
    const current = await this.prisma.favorite.findUnique({ where: key })
    if (current) await this.prisma.favorite.delete({ where: key })
    else
      await this.prisma.favorite.create({ data: { userId: user.id, literatureId: literature.id } })
    return { favorited: !current }
  }

  async metaDocuments() {
    return this.prisma.metaDocument.findMany({
      where: {
        status: { in: ['CURRENT', 'SUPERSEDED'] },
        versions: { some: { publishedAt: { not: null } } },
      },
      include: {
        category: true,
        versions: {
          where: { publishedAt: { not: null } },
          orderBy: { version: 'desc' },
          take: 1,
          select: { version: true, effectiveAt: true, publishedAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }
  async metaDocumentCategories() {
    return this.prisma.metaDocumentCategory.findMany({ orderBy: { code: 'asc' } })
  }

  async metaDocument(slug: string) {
    const doc = await this.prisma.metaDocument.findFirst({
      where: { slug, status: { in: ['CURRENT', 'SUPERSEDED'] } },
      include: {
        category: true,
        versions: { where: { publishedAt: { not: null } }, orderBy: { version: 'desc' } },
      },
    })
    if (!doc) throw new NotFoundException('元文献不存在')
    return doc
  }

  async upsertTaxonomy(kind: 'category' | 'subcategory', code: string, body: any, actor: any) {
    if (!/^\d{2}$/.test(code) || typeof body.name !== 'string' || !body.name.trim())
      throw new BadRequestException('编号或名称无效')
    const data = {
      name: body.name.trim(),
      sortOrder: Number(body.sortOrder) || 0,
      active: body.active !== false,
    }
    let saved: any
    if (kind === 'category') {
      saved = await this.prisma.category.upsert({
        where: { code },
        update: data,
        create: { code, ...data },
      })
    } else {
      const parent = await this.prisma.category.findUnique({ where: { code: '04' } })
      if (!parent) throw new NotFoundException('政论文书主分类不存在')
      saved = await this.prisma.subcategory.upsert({
        where: { parentCategoryId_code: { parentCategoryId: parent.id, code } },
        update: data,
        create: { parentCategoryId: parent.id, code, ...data },
      })
    }
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: `${kind.toUpperCase()}_UPSERT`,
        entityType: kind === 'subcategory' ? 'political_subcategory' : kind,
        entityId: saved.id,
        details: { code, name: saved.name, active: saved.active },
      },
    })
    return saved
  }

  async listUsers(query: any) {
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 30))
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count(),
    ])
    return { items, total, page, pageSize }
  }

  async changeUserRole(id: string, role: string, actor: any) {
    if (!['USER', 'REVIEWER', 'ADMIN'].includes(role)) throw new BadRequestException('角色无效')
    if (id === actor.id && role !== 'ADMIN')
      throw new BadRequestException('不能移除当前登录管理员的管理员角色')
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, username: true, role: true, status: true },
    })
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'USER_ROLE_CHANGED',
        entityType: 'user',
        entityId: id,
        details: { role },
      },
    })
    return user
  }

  async auditLogs(query: any) {
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50))
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        include: { actor: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count(),
    ])
    return { items, total, page, pageSize }
  }

  async createMetaDraft(actor: any, body: any) {
    const category = await this.prisma.metaDocumentCategory.findUnique({
      where: { code: String(body.categoryCode ?? '') },
    })
    if (!category || !body.title?.trim() || !body.slug?.trim() || !body.content?.trim())
      throw new BadRequestException('标题、URL 标识、分类与正文均为必填项')
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.metaDocument.create({
        data: {
          slug: body.slug.trim(),
          title: body.title.trim(),
          categoryId: category.id,
          summary: String(body.summary ?? '').trim(),
          versions: {
            create: {
              version: 1,
              content: body.content,
              changeNote: String(body.changeNote ?? '初稿'),
              createdById: actor.id,
            },
          },
        },
        include: { category: true, versions: true },
      })
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'META_DOCUMENT_DRAFT_CREATED',
          entityType: 'meta_document',
          entityId: doc.id,
        },
      })
      return doc
    })
  }

  async publishMetaDocument(id: string, actor: any, body: any) {
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.metaDocument.findUnique({
        where: { id },
        include: {
          versions: { where: { publishedAt: null }, orderBy: { version: 'desc' }, take: 1 },
        },
      })
      const version = doc?.versions[0]
      if (!doc || !version) throw new BadRequestException('没有待发布的元文献版本')
      const now = new Date()
      await tx.metaDocumentVersion.update({
        where: { id: version.id },
        data: {
          publishedAt: now,
          effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : now,
        },
      })
      const result = await tx.metaDocument.update({
        where: { id },
        data: { status: 'CURRENT', currentVersion: version.version },
      })
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'META_DOCUMENT_PUBLISHED',
          entityType: 'meta_document',
          entityId: id,
          details: { version: version.version },
        },
      })
      return result
    })
  }

  async retireMetaDocument(id: string, actor: any, status: 'SUPERSEDED' | 'WITHDRAWN') {
    const doc = await this.prisma.metaDocument.update({ where: { id }, data: { status } })
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: `META_DOCUMENT_${status}`,
        entityType: 'meta_document',
        entityId: id,
      },
    })
    return doc
  }

  private async saveSubmissionVersion(id: string, userId: string, data: any, changeNote: string) {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.submissionVersion.findFirst({
        where: { submissionId: id },
        orderBy: { version: 'desc' },
      })
      await tx.submission.update({ where: { id }, data })
      const version = await tx.submissionVersion.create({
        data: {
          submissionId: id,
          version: (latest?.version ?? 0) + 1,
          snapshot: data,
          changeNote,
          createdById: userId,
        },
      })
      const row = await tx.submission.findUnique({
        where: { id },
        include: { category: true, subcategory: true },
      })
      return { ...submissionDto(row), latestVersion: version.version }
    })
  }
  private submissionData(body: any, categoryId: string, subcategoryId: string | null) {
    for (const field of ['title', 'authorName', 'summary', 'content', 'sourceDescription'])
      if (typeof body[field] !== 'string') throw new BadRequestException(`字段 ${field} 格式无效`)
    if (body.title.length > 240 || body.content.length > 500000)
      throw new BadRequestException('标题或正文长度超出限制')
    if (body.sourceUrl && !/^https?:\/\//i.test(body.sourceUrl))
      throw new BadRequestException('来源链接必须为 HTTP 或 HTTPS 地址')
    return {
      title: body.title.trim(),
      authorName: body.authorName.trim(),
      categoryId,
      subcategoryId,
      summary: body.summary.trim(),
      content: body.content,
      sourceDescription: body.sourceDescription.trim(),
      sourceUrl: body.sourceUrl || null,
      sourceDate: body.sourceDate || null,
    }
  }
  private async resolveSubcategory(categoryId: string, code: unknown) {
    if (!code) return null
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } })
    if (category?.code !== '04')
      throw new BadRequestException('十大分期仅适用于政论文书类文献')
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { parentCategoryId_code: { parentCategoryId: categoryId, code: String(code) } },
    })
    if (!subcategory || !subcategory.active)
      throw new BadRequestException('政论文书子分类无效或已停用')
    return subcategory.id
  }
  private async startSession(user: any) {
    const token = randomBytes(32).toString('base64url')
    await this.prisma.userSession.create({
      data: {
        tokenHash: createHash('sha256').update(token).digest('hex'),
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      },
    })
    return { token, user: publicUser(user) }
  }
  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex')
    return `scrypt$${salt}$${(await scrypt(password, salt, 64)).toString('hex')}`
  }
  private async verifyPassword(password: string, stored: string) {
    const [algorithm, salt, expectedHex] = stored.split('$')
    if (algorithm !== 'scrypt' || !salt || !expectedHex) return false
    const expected = Buffer.from(expectedHex, 'hex')
    const actual = await scrypt(password, salt, expected.length)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }
}
