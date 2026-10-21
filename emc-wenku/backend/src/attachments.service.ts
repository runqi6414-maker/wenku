import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common'
import { createReadStream } from 'node:fs'
import { mkdir, unlink } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { PrismaService } from './prisma.service'

const TYPES: Record<string, { mediaType: string; signature: (header: Buffer) => boolean }> = {
  '.pdf': { mediaType: 'application/pdf', signature: (b) => b.subarray(0, 5).toString() === '%PDF-' },
  '.jpg': { mediaType: 'image/jpeg', signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  '.jpeg': { mediaType: 'image/jpeg', signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  '.png': { mediaType: 'image/png', signature: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  '.webp': { mediaType: 'image/webp', signature: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  '.docx': { mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', signature: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 },
}

@Injectable()
export class AttachmentsService implements OnModuleInit {
  private readonly directory = resolve(process.env.ATTACHMENT_STORAGE_DIR ?? './private-uploads')
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 })
  }

  async upload(user: any, submissionId: string, files: any[]) {
    if (!files?.length) throw new BadRequestException('请选择要上传的附件')
    const created: any[] = []
    try {
      if (files.length > 5) throw new BadRequestException('每次最多上传 5 个附件')
      const submission = await this.prisma.submission.findUnique({ where: { id: submissionId } })
      if (!submission || submission.submitterId !== user.id) throw new NotFoundException('投稿不存在')
      if (!['DRAFT', 'REVISION_REQUESTED'].includes(submission.status))
        throw new BadRequestException('只有草稿或待修改投稿可以管理附件')
      const currentCount = await this.prisma.literatureAttachment.count({ where: { submissionId } })
      if (currentCount + files.length > 10) throw new BadRequestException('每篇投稿最多保留 10 个附件')
      const checked: Array<{
        file: any
        type: (typeof TYPES)[string]
        safeName: string
      }> = []
      for (const file of files) {
        const extension = extname(file.originalname).toLowerCase()
        const type = TYPES[extension]
        const header = Buffer.alloc(16)
        const fs = await import('node:fs/promises')
        const handle = await fs.open(file.path, 'r')
        try { await handle.read(header, 0, header.length, 0) } finally { await handle.close() }
        if (!type || !type.signature(header)) throw new BadRequestException(`不支持或无法识别文件：${file.originalname}`)
        checked.push({ file, type, safeName: file.originalname.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 255) })
      }
      for (const { file, type, safeName } of checked) {
        const record = await this.prisma.literatureAttachment.create({
          data: {
            submissionId,
            originalName: safeName,
            storageKey: file.filename,
            mediaType: type.mediaType,
            size: file.size,
          },
        })
        created.push(this.toDto(record))
      }
      return created
    } catch (error) {
      await this.prisma.literatureAttachment
        .deleteMany({ where: { storageKey: { in: files.map((file) => file.filename) } } })
        .catch(() => undefined)
      for (const file of files) await unlink(file.path).catch(() => undefined)
      if (error instanceof BadRequestException) throw error
      throw error
    }
  }

  async remove(user: any, submissionId: string, attachmentId: string) {
    const attachment = await this.prisma.literatureAttachment.findUnique({ where: { id: attachmentId }, include: { submission: true } })
    if (!attachment || attachment.submissionId !== submissionId || attachment.submission.submitterId !== user.id)
      throw new NotFoundException('附件不存在')
    if (!['DRAFT', 'REVISION_REQUESTED'].includes(attachment.submission.status))
      throw new BadRequestException('当前投稿状态不允许删除附件')
    await this.prisma.literatureAttachment.delete({ where: { id: attachmentId } })
    await unlink(this.filePath(attachment.storageKey)).catch(() => undefined)
    return { ok: true }
  }

  async privateFile(user: any, submissionId: string, attachmentId: string) {
    const attachment = await this.prisma.literatureAttachment.findUnique({ where: { id: attachmentId }, include: { submission: true } })
    if (!attachment || attachment.submissionId !== submissionId) throw new NotFoundException('附件不存在')
    if (attachment.submission.submitterId !== user.id && !['ADMIN', 'REVIEWER'].includes(user.role))
      throw new NotFoundException('附件不存在')
    return { ...this.toDto(attachment), stream: createReadStream(this.filePath(attachment.storageKey)) }
  }

  async publicFile(literatureId: string, attachmentId: string) {
    const attachment = await this.prisma.literatureAttachment.findFirst({
      where: { id: attachmentId, literatureId, literature: { status: 'PUBLISHED' } },
    })
    if (!attachment) throw new NotFoundException('附件不存在')
    return { ...this.toDto(attachment), stream: createReadStream(this.filePath(attachment.storageKey)) }
  }

  private filePath(key: string) {
    if (!/^[0-9a-f-]{36}$/i.test(key)) throw new NotFoundException('附件不存在')
    return resolve(this.directory, key)
  }
  private toDto(file: any) {
    return { id: file.id, name: file.originalName, mediaType: file.mediaType, size: file.size, createdAt: file.createdAt }
  }
}
