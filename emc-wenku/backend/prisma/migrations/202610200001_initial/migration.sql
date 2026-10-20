-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "LiteratureStatus" AS ENUM ('PUBLISHED', 'WITHDRAWN', 'HIDDEN');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('NEW_LITERATURE', 'REVISION');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'PUBLISHED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MetaDocumentStatus" AS ENUM ('DRAFT', 'CURRENT', 'SUPERSEDED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "email" VARCHAR(254),
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periods" (
    "id" UUID NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "literature" (
    "id" UUID NOT NULL,
    "public_code" VARCHAR(32) NOT NULL,
    "slug" VARCHAR(180),
    "title" VARCHAR(240) NOT NULL,
    "author_name" VARCHAR(160) NOT NULL,
    "author_user_id" UUID,
    "category_id" UUID NOT NULL,
    "period_id" UUID,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_description" TEXT NOT NULL,
    "source_url" TEXT,
    "created_at_source" VARCHAR(80),
    "event_start_date" DATE,
    "event_end_date" DATE,
    "published_at" TIMESTAMP(3),
    "status" "LiteratureStatus" NOT NULL DEFAULT 'PUBLISHED',
    "view_count" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "literature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "literature_versions" (
    "id" UUID NOT NULL,
    "literature_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "author_name" VARCHAR(160) NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_note" TEXT NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "literature_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "submitter_id" UUID NOT NULL,
    "submission_type" "SubmissionType" NOT NULL DEFAULT 'NEW_LITERATURE',
    "target_literature_id" UUID,
    "title" VARCHAR(240) NOT NULL,
    "author_name" VARCHAR(160) NOT NULL,
    "category_id" UUID NOT NULL,
    "period_id" UUID,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_description" TEXT NOT NULL,
    "source_url" TEXT,
    "source_date" VARCHAR(80),
    "declaration_accepted_at" TIMESTAMP(3),
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewer_id" UUID,
    "published_literature_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_versions" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_note" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_records" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "submission_version_id" UUID,
    "reviewer_id" UUID NOT NULL,
    "from_status" "SubmissionStatus",
    "to_status" "SubmissionStatus" NOT NULL,
    "comment" TEXT NOT NULL,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" UUID NOT NULL,
    "literature_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","literature_id")
);

-- CreateTable
CREATE TABLE "meta_document_categories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(80) NOT NULL,

    CONSTRAINT "meta_document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_documents" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "category_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "MetaDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "current_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "change_note" TEXT NOT NULL,
    "effective_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_view_events" (
    "id" UUID NOT NULL,
    "literature_id" UUID NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitor_hash" VARCHAR(64),

    CONSTRAINT "page_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(80),
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "periods_code_key" ON "periods"("code");

-- CreateIndex
CREATE UNIQUE INDEX "literature_public_code_key" ON "literature"("public_code");

-- CreateIndex
CREATE UNIQUE INDEX "literature_slug_key" ON "literature"("slug");

-- CreateIndex
CREATE INDEX "literature_status_published_at_idx" ON "literature"("status", "published_at");

-- CreateIndex
CREATE INDEX "literature_category_id_period_id_idx" ON "literature"("category_id", "period_id");

-- CreateIndex
CREATE UNIQUE INDEX "literature_versions_literature_id_version_key" ON "literature_versions"("literature_id", "version");

-- CreateIndex
CREATE INDEX "submissions_status_submitted_at_idx" ON "submissions"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "submissions_submitter_id_updated_at_idx" ON "submissions"("submitter_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "submission_versions_submission_id_version_key" ON "submission_versions"("submission_id", "version");

-- CreateIndex
CREATE INDEX "review_records_submission_id_created_at_idx" ON "review_records"("submission_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "meta_document_categories_code_key" ON "meta_document_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "meta_documents_slug_key" ON "meta_documents"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "meta_document_versions_document_id_version_key" ON "meta_document_versions"("document_id", "version");

-- CreateIndex
CREATE INDEX "page_view_events_literature_id_occurred_at_idx" ON "page_view_events"("literature_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "literature" ADD CONSTRAINT "literature_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "literature" ADD CONSTRAINT "literature_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "literature_versions" ADD CONSTRAINT "literature_versions_literature_id_fkey" FOREIGN KEY ("literature_id") REFERENCES "literature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_target_literature_id_fkey" FOREIGN KEY ("target_literature_id") REFERENCES "literature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_records" ADD CONSTRAINT "review_records_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_records" ADD CONSTRAINT "review_records_submission_version_id_fkey" FOREIGN KEY ("submission_version_id") REFERENCES "submission_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_records" ADD CONSTRAINT "review_records_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_literature_id_fkey" FOREIGN KEY ("literature_id") REFERENCES "literature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_documents" ADD CONSTRAINT "meta_documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "meta_document_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_document_versions" ADD CONSTRAINT "meta_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "meta_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_view_events" ADD CONSTRAINT "page_view_events_literature_id_fkey" FOREIGN KEY ("literature_id") REFERENCES "literature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

