-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN "target" TEXT;

-- AlterTable
ALTER TABLE "DigitalStock" ADD COLUMN "expiryDate" DATETIME;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "note" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "providerStatus" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "providerTrxId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "sn" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "target" TEXT;

-- CreateTable
CREATE TABLE "VariantProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variantId" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "providerSku" TEXT NOT NULL,
    "providerPrice" DECIMAL NOT NULL,
    "providerStatus" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VariantProvider_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DigiflazzCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "lastFetch" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "socialProofMode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "instantDeliveryInfo" TEXT DEFAULT 'Produk dikirim otomatis oleh sistem 24/7.',
    "warrantyInfo" TEXT DEFAULT 'Garansi penuh selama durasi langganan.',
    "supportInfo" TEXT DEFAULT 'Hubungi kami jika ada kendala.',
    "ratingValue" REAL NOT NULL DEFAULT 5.0,
    "reviewCount" INTEGER NOT NULL DEFAULT 100,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "wishlistCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "createdAt", "description", "id", "imageUrl", "instantDeliveryInfo", "isActive", "isDeleted", "name", "ratingValue", "reviewCount", "slug", "socialProofMode", "soldCount", "supportInfo", "updatedAt", "warrantyInfo") SELECT "categoryId", "createdAt", "description", "id", "imageUrl", "instantDeliveryInfo", "isActive", "isDeleted", "name", "ratingValue", "reviewCount", "slug", "socialProofMode", "soldCount", "supportInfo", "updatedAt", "warrantyInfo" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE TABLE "new_ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "originalPrice" DECIMAL,
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
INSERT INTO "new_ProductVariant" ("durationDays", "id", "isActive", "isDeleted", "name", "originalPrice", "price", "productId", "sortOrder", "warrantyDays") SELECT "durationDays", "id", "isActive", "isDeleted", "name", "originalPrice", "price", "productId", "sortOrder", "warrantyDays" FROM "ProductVariant";
DROP TABLE "ProductVariant";
ALTER TABLE "new_ProductVariant" RENAME TO "ProductVariant";
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "VariantProvider_variantId_idx" ON "VariantProvider"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantProvider_providerCode_providerSku_key" ON "VariantProvider"("providerCode", "providerSku");

-- CreateIndex
CREATE UNIQUE INDEX "DigiflazzCache_cacheKey_key" ON "DigiflazzCache"("cacheKey");
