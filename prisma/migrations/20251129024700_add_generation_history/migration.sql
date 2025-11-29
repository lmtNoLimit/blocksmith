-- CreateTable
CREATE TABLE "GenerationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "themeId" TEXT,
    "themeName" TEXT,
    "fileName" TEXT,
    "tone" TEXT,
    "style" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "GenerationHistory_shop_idx" ON "GenerationHistory"("shop");

-- CreateIndex
CREATE INDEX "GenerationHistory_createdAt_idx" ON "GenerationHistory"("createdAt");

-- CreateIndex
CREATE INDEX "GenerationHistory_status_idx" ON "GenerationHistory"("status");
