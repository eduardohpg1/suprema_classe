-- ============================================================
-- MIGRAÇÃO V2: Múltiplos produtos por locação (RentalItem)
-- Rodar no Supabase SQL Editor
-- ============================================================

-- 1. Criar tabela RentalItem
CREATE TABLE "RentalItem" (
    "id"        TEXT NOT NULL,
    "rentalId"  TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity"  INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "RentalItem_pkey" PRIMARY KEY ("id")
);

-- 2. Índices e constraints do RentalItem
CREATE UNIQUE INDEX "RentalItem_rentalId_productId_key" ON "RentalItem"("rentalId", "productId");
CREATE INDEX "RentalItem_rentalId_idx" ON "RentalItem"("rentalId");
CREATE INDEX "RentalItem_productId_idx" ON "RentalItem"("productId");

ALTER TABLE "RentalItem"
    ADD CONSTRAINT "RentalItem_rentalId_fkey"
    FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RentalItem"
    ADD CONSTRAINT "RentalItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Migrar dados existentes: copiar productId atual para RentalItem
INSERT INTO "RentalItem" ("id", "rentalId", "productId", "unitPrice", "quantity")
SELECT
    gen_random_uuid()::text,
    r."id",
    r."productId",
    COALESCE(p."rentalPrice", r."totalValue"),
    1
FROM "Rental" r
LEFT JOIN "Product" p ON p."id" = r."productId"
WHERE r."productId" IS NOT NULL;

-- 4. Remover FK e coluna productId de Rental
ALTER TABLE "Rental" DROP CONSTRAINT IF EXISTS "Rental_productId_fkey";
DROP INDEX IF EXISTS "Rental_productId_idx";
ALTER TABLE "Rental" DROP COLUMN IF EXISTS "productId";

-- 5. Remover tabelas de acessórios antigas
DROP TABLE IF EXISTS "RentalAccessory" CASCADE;
DROP TABLE IF EXISTS "Accessory" CASCADE;
