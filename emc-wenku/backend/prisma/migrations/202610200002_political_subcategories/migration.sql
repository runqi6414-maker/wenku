-- Reclassify the ten historical periods as subcategories owned by category 04 (政论文书).
CREATE TABLE "subcategories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "parent_category_id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

INSERT INTO "subcategories" ("id", "code", "parent_category_id", "name", "sort_order", "active")
SELECT p."id", p."code", c."id", p."name", p."sort_order", p."active"
FROM "periods" p
JOIN "categories" c ON c."code" = '04';

ALTER TABLE "literature" ADD COLUMN "subcategory_id" UUID;
ALTER TABLE "submissions" ADD COLUMN "subcategory_id" UUID;

UPDATE "literature" l
SET "subcategory_id" = p."id"
FROM "periods" p
JOIN "categories" c ON c."code" = '04'
WHERE l."period_id" = p."id" AND l."category_id" = c."id";

UPDATE "submissions" s
SET "subcategory_id" = p."id"
FROM "periods" p
JOIN "categories" c ON c."code" = '04'
WHERE s."period_id" = p."id" AND s."category_id" = c."id";

DROP INDEX "literature_category_id_period_id_idx";
CREATE INDEX "literature_category_id_subcategory_id_idx" ON "literature"("category_id", "subcategory_id");
CREATE UNIQUE INDEX "subcategories_parent_category_id_code_key" ON "subcategories"("parent_category_id", "code");
CREATE INDEX "subcategories_parent_category_id_sort_order_idx" ON "subcategories"("parent_category_id", "sort_order");

ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "literature" ADD CONSTRAINT "literature_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "literature" DROP CONSTRAINT "literature_period_id_fkey";
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_period_id_fkey";
ALTER TABLE "literature" DROP COLUMN "period_id";
ALTER TABLE "submissions" DROP COLUMN "period_id";
DROP INDEX "periods_code_key";
DROP TABLE "periods";
