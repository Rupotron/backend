-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN "slug" TEXT,
ADD COLUMN "icon" TEXT,
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Create unique index on slug
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- AlterTable  
ALTER TABLE "Service" ADD COLUMN "slug" TEXT,
ADD COLUMN "icon" TEXT,
ADD COLUMN "isPopular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- Create unique index on slug
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- Backfill existing services with slugs based on name
UPDATE "Service" SET slug = LOWER(REPLACE(REPLACE(REPLACE("name", ' ', '-'), '&', 'and'), '/', '-'))
WHERE slug IS NULL;

-- Backfill existing categories with slugs based on name
UPDATE "ServiceCategory" SET slug = LOWER(REPLACE(REPLACE(REPLACE("name", ' ', '-'), '&', 'and'), '/', '-'))
WHERE slug IS NULL;
