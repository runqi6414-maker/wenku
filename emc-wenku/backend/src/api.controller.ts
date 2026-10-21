import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  StreamableFile,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiService } from './api.service'
import { AuthGuard, CurrentUser, Roles, RolesGuard } from './security'
import { AttachmentsService } from './attachments.service'

class RegisterDto {
  @IsString() @MinLength(3) @MaxLength(32) username!: string
  @IsEmail() @MaxLength(254) email!: string
  @IsString() @MinLength(12) @MaxLength(128) password!: string
}
class LoginDto {
  @IsString() @MaxLength(254) username!: string
  @IsString() @MaxLength(128) password!: string
}
class SubmissionDto {
  @IsString() @MaxLength(240) title!: string
  @IsString() @MaxLength(160) authorName!: string
  @IsString() @MaxLength(2) category!: string
  @IsOptional() @IsString() @MaxLength(2) subcategory?: string
  @IsString() @MaxLength(3000) summary!: string
  @IsString() @MaxLength(500000) content!: string
  @IsString() @MaxLength(3000) sourceDescription!: string
  @IsOptional() @IsString() @MaxLength(2000) sourceUrl?: string
  @IsOptional() @IsString() @MaxLength(80) sourceDate?: string
  @IsOptional() @IsString() @MaxLength(500) changeNote?: string
}

@Controller()
export class ApiController {
  constructor(private api: ApiService, private attachments: AttachmentsService) {}

  private asFile(file: any) {
    return new StreamableFile(file.stream, {
      type: file.mediaType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    })
  }

  @Get('health') health() {
    return { status: 'ok' }
  }
  @Post('auth/register') async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: any,
  ) {
    return this.issueSession(await this.api.register(body), res)
  }
  @Post('auth/login') async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: any) {
    return this.issueSession(await this.api.login(body), res)
  }
  @Post('auth/logout') @UseGuards(AuthGuard) async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    await this.api.logout(req.sessionId)
    res.clearCookie('emc_session', { path: '/' })
    return { ok: true }
  }
  @Get('auth/me') @UseGuards(AuthGuard) me(@CurrentUser() user: any) {
    return user
  }

  @Get('categories') categories() {
    return this.api.categories()
  }
  @Get('categories/:categoryCode/subcategories') subcategories(
    @Param('categoryCode') categoryCode: string,
  ) {
    return this.api.subcategories(categoryCode)
  }
  @Get('literature') literature(@Query() query: any) {
    return this.api.literature(query)
  }
  @Get('literature/:id') detail(@Param('id') id: string) {
    return this.api.detail(id)
  }
  @Get('home/overview') homeOverview() {
    return this.api.homeOverview()
  }
  @Get('home/recent-literature') recentLiterature() {
    return this.api.recentLiterature()
  }
  @Get('home/popular-literature') popularLiterature() {
    return this.api.popularLiterature()
  }
  @Get('meta-documents') metaDocuments() {
    return this.api.metaDocuments()
  }
  @Get('admin/meta-document-categories')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  metaDocumentCategories() {
    return this.api.metaDocumentCategories()
  }
  @Get('meta-documents/:slug') metaDocument(@Param('slug') slug: string) {
    return this.api.metaDocument(slug)
  }
  @Patch('admin/categories/:code') @UseGuards(AuthGuard, RolesGuard) @Roles('ADMIN') updateCategory(
    @Param('code') code: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.api.upsertTaxonomy('category', code, body, user)
  }
  @Patch('admin/subcategories/:code') @UseGuards(AuthGuard, RolesGuard) @Roles('ADMIN') updateSubcategory(
    @Param('code') code: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.api.upsertTaxonomy('subcategory', code, body, user)
  }

  @Post('submissions') @UseGuards(AuthGuard) createSubmission(
    @CurrentUser() user: any,
    @Body() body: SubmissionDto,
  ) {
    return this.api.createSubmission(user, body)
  }
  @Post('submissions/:id/attachments')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files', 5, {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
        const directory = resolve(process.env.ATTACHMENT_STORAGE_DIR ?? './private-uploads')
        mkdirSync(directory, { recursive: true, mode: 0o700 })
        callback(null, directory)
      },
      filename: (_req, _file, callback) => callback(null, randomUUID()),
    }),
    limits: { files: 5, fileSize: 10 * 1024 * 1024 },
  }))
  uploadSubmissionAttachments(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFiles() files: any[],
  ) {
    return this.attachments.upload(user, id, files)
  }
  @Get('submissions/:id/attachments/:attachmentId/file')
  @UseGuards(AuthGuard)
  async privateSubmissionAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: any,
  ) {
    return this.asFile(await this.attachments.privateFile(user, id, attachmentId))
  }
  @Delete('submissions/:id/attachments/:attachmentId')
  @UseGuards(AuthGuard)
  removeSubmissionAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: any,
  ) {
    return this.attachments.remove(user, id, attachmentId)
  }
  @Get('literature/:id/attachments/:attachmentId/file')
  async publicLiteratureAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.asFile(await this.attachments.publicFile(id, attachmentId))
  }
  @Get('submissions/mine') @UseGuards(AuthGuard) mySubmissions(@CurrentUser() user: any) {
    return this.api.mySubmissions(user)
  }
  @Get('submissions/:id') @UseGuards(AuthGuard) async submission(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.api.submission(id, user, ['ADMIN', 'REVIEWER'].includes(user.role))
  }
  @Patch('submissions/:id') @UseGuards(AuthGuard) updateSubmission(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: SubmissionDto,
  ) {
    return this.api.updateSubmission(id, user, body)
  }
  @Post('submissions/:id/submit') @UseGuards(AuthGuard) submitSubmission(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.api.submitSubmission(id, user, body?.declarationAccepted === true)
  }
  @Post('submissions/:id/withdraw') @UseGuards(AuthGuard) withdrawSubmission(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.api.withdrawSubmission(id, user)
  }

  @Get('me/favorites') @UseGuards(AuthGuard) favorites(@CurrentUser() user: any) {
    return this.api.favorites(user)
  }
  @Post('me/favorites/:id') @UseGuards(AuthGuard) toggleFavorite(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.api.toggleFavorite(user, id)
  }

  @Get('admin/submissions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'REVIEWER')
  reviewQueue(@Query('status') status?: string) {
    return this.api.reviewQueue(status)
  }
  @Get('admin/literature') @UseGuards(AuthGuard, RolesGuard) @Roles('ADMIN') adminLiterature(
    @Query() query: any,
  ) {
    return this.api.adminLiterature(query)
  }
  @Patch('admin/literature/:id') @UseGuards(AuthGuard, RolesGuard) @Roles('ADMIN') reviseLiterature(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.api.reviseLiterature(id, user, body)
  }
  @Patch('admin/literature/:id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  setLiteratureStatus(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.api.setLiteratureStatus(id, user, String(body.status ?? ''))
  }
  @Post('admin/submissions/:id/review')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'REVIEWER')
  review(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.api.review(id, user, body)
  }
  @Post('admin/submissions/:id/publish') @UseGuards(AuthGuard, RolesGuard) @Roles('ADMIN') publish(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.api.publish(id, user)
  }
  @Get('admin/users') @UseGuards(AuthGuard, RolesGuard) @Roles('ADMIN') users(@Query() query: any) {
    return this.api.listUsers(query)
  }
  @Patch('admin/users/:id/role') @UseGuards(AuthGuard, RolesGuard) @Roles('ADMIN') changeRole(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.api.changeUserRole(id, String(body.role ?? ''), user)
  }
  @Get('admin/audit-logs') @UseGuards(AuthGuard, RolesGuard) @Roles('ADMIN') auditLogs(
    @Query() query: any,
  ) {
    return this.api.auditLogs(query)
  }
  @Post('admin/meta-documents') @UseGuards(AuthGuard, RolesGuard) @Roles('ADMIN') createMetaDraft(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.api.createMetaDraft(user, body)
  }
  @Post('admin/meta-documents/:id/publish')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  publishMetaDocument(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.api.publishMetaDocument(id, user, body)
  }
  @Post('admin/meta-documents/:id/retire')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  retireMetaDocument(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.api.retireMetaDocument(
      id,
      user,
      body.status === 'WITHDRAWN' ? 'WITHDRAWN' : 'SUPERSEDED',
    )
  }

  private issueSession(session: { token: string; user: any }, res: any) {
    res.cookie('emc_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    })
    return { user: session.user }
  }
}
