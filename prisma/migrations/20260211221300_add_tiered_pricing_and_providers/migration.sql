-- CreateTable
CREATE TABLE "ProviderCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastSync" DATETIME,
    "balance" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" DECIMAL NOT NULL DEFAULT 0,
    "price" DECIMAL NOT NULL,
    "priceMember" DECIMAL NOT NULL DEFAULT 0,
    "pricePlatinum" DECIMAL NOT NULL DEFAULT 0,
    "priceGold" DECIMAL NOT NULL DEFAULT 0,
    "originalPrice" DECIMAL,
    "profitMargin" DECIMAL NOT NULL DEFAULT 10,
    "profitMarginMember" DECIMAL NOT NULL DEFAULT 8,
    "profitMarginPlatinum" DECIMAL NOT NULL DEFAULT 6,
    "profitMarginGold" DECIMAL NOT NULL DEFAULT 5,
    "sku" TEXT,
    "bestProvider" TEXT,
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

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCredentials_provider_key" ON "ProviderCredentials"("provider");
