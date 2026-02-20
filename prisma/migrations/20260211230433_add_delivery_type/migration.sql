/*
  Warnings:

  - You are about to drop the `ProviderCredentials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `basePrice` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `priceGold` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `priceMember` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `pricePlatinum` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `profitMargin` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `profitMarginGold` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `profitMarginMember` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `profitMarginPlatinum` on the `ProductVariant` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ProviderCredentials_provider_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProviderCredentials";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "originalPrice" DECIMAL,
    "sku" TEXT,
    "bestProvider" TEXT,
    "deliveryType" TEXT NOT NULL DEFAULT 'manual',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "durationDays" INTEGER NOT NULL,
    "warrantyDays" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProductVariant" ("bestProvider", "durationDays", "id", "isActive", "isDeleted", "name", "originalPrice", "price", "productId", "sku", "sortOrder", "stock", "warrantyDays") SELECT "bestProvider", "durationDays", "id", "isActive", "isDeleted", "name", "originalPrice", "price", "productId", "sku", "sortOrder", "stock", "warrantyDays" FROM "ProductVariant";
DROP TABLE "ProductVariant";
ALTER TABLE "new_ProductVariant" RENAME TO "ProductVariant";
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
