-- CreateTable
CREATE TABLE "SectionTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "code" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SectionTemplate_shop_idx" ON "SectionTemplate"("shop");

-- CreateIndex
CREATE INDEX "SectionTemplate_category_idx" ON "SectionTemplate"("category");
