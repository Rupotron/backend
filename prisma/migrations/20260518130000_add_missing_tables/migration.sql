-- Ensure ServiceCategory table exists
CREATE TABLE IF NOT EXISTS "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- Ensure unique constraint on ServiceCategory name
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceCategory_name_key" ON "ServiceCategory"("name");

-- Ensure Service table exists if not already created
CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- Add foreign key if not exists (this is trickier in Postgres, so we use a conditional approach)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Service_categoryId_fkey'
    ) THEN
        ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" 
            FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
