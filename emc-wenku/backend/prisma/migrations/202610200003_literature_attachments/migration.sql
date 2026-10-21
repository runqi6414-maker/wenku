CREATE TABLE "literature_attachments" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "literature_id" UUID,
    "original_name" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(80) NOT NULL,
    "media_type" VARCHAR(120) NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "literature_attachments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "literature_attachments_storage_key_key" ON "literature_attachments"("storage_key");
CREATE INDEX "literature_attachments_submission_id_created_at_idx" ON "literature_attachments"("submission_id", "created_at");
CREATE INDEX "literature_attachments_literature_id_idx" ON "literature_attachments"("literature_id");
ALTER TABLE "literature_attachments" ADD CONSTRAINT "literature_attachments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "literature_attachments" ADD CONSTRAINT "literature_attachments_literature_id_fkey" FOREIGN KEY ("literature_id") REFERENCES "literature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
