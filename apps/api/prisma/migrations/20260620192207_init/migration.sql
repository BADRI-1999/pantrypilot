-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'My Household',
    "size" INTEGER NOT NULL DEFAULT 1,
    "goal" TEXT NOT NULL DEFAULT 'maintain',
    "diet" TEXT NOT NULL DEFAULT 'veg',
    "allergies" TEXT NOT NULL DEFAULT '',
    "proteinTargetG" INTEGER NOT NULL DEFAULT 60,
    "calorieTarget" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FoodEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "baseUnit" TEXT NOT NULL DEFAULT 'g',
    "caloriesPer100" REAL NOT NULL DEFAULT 0,
    "proteinPer100" REAL NOT NULL DEFAULT 0,
    "carbsPer100" REAL NOT NULL DEFAULT 0,
    "fatPer100" REAL NOT NULL DEFAULT 0,
    "fibrePer100" REAL NOT NULL DEFAULT 0,
    "densityGPerMl" REAL NOT NULL DEFAULT 1.0,
    "shelfLifeDays" INTEGER,
    "reorderThreshold" REAL NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "aliases" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "imagePath" TEXT,
    "merchant" TEXT,
    "purchasedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceiptLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "price" REAL,
    "foodEntityId" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "ReceiptLineItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReceiptLineItem_foodEntityId_fkey" FOREIGN KEY ("foodEntityId") REFERENCES "FoodEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "foodEntityId" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "location" TEXT NOT NULL DEFAULT 'pantry',
    "expiryDate" DATETIME,
    "confidence" REAL NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_foodEntityId_fkey" FOREIGN KEY ("foodEntityId") REFERENCES "FoodEntity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "foodEntityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "delta" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "idempotencyKey" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_foodEntityId_fkey" FOREIGN KEY ("foodEntityId") REFERENCES "FoodEntity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT,
    "name" TEXT NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'curated',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recipe_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "foodEntityId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeIngredient_foodEntityId_fkey" FOREIGN KEY ("foodEntityId") REFERENCES "FoodEntity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "recipeId" TEXT,
    "name" TEXT NOT NULL,
    "servings" REAL NOT NULL DEFAULT 1,
    "eaters" INTEGER NOT NULL DEFAULT 1,
    "imagePath" TEXT,
    "calories" REAL NOT NULL DEFAULT 0,
    "protein" REAL NOT NULL DEFAULT 0,
    "carbs" REAL NOT NULL DEFAULT 0,
    "fat" REAL NOT NULL DEFAULT 0,
    "fibre" REAL NOT NULL DEFAULT 0,
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealLog_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MealLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShoppingListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "foodEntityId" TEXT NOT NULL,
    "suggestedQty" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "reason" TEXT NOT NULL DEFAULT 'low',
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShoppingListItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShoppingListItem_foodEntityId_fkey" FOREIGN KEY ("foodEntityId") REFERENCES "FoodEntity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodEntity_name_key" ON "FoodEntity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FoodEntity_barcode_key" ON "FoodEntity"("barcode");

-- CreateIndex
CREATE INDEX "FoodEntity_category_idx" ON "FoodEntity"("category");

-- CreateIndex
CREATE INDEX "Receipt_householdId_idx" ON "Receipt"("householdId");

-- CreateIndex
CREATE INDEX "ReceiptLineItem_receiptId_idx" ON "ReceiptLineItem"("receiptId");

-- CreateIndex
CREATE INDEX "InventoryItem_householdId_idx" ON "InventoryItem"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_householdId_foodEntityId_key" ON "InventoryItem"("householdId", "foodEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerEntry_householdId_idx" ON "LedgerEntry"("householdId");

-- CreateIndex
CREATE INDEX "LedgerEntry_foodEntityId_idx" ON "LedgerEntry"("foodEntityId");

-- CreateIndex
CREATE INDEX "Recipe_householdId_idx" ON "Recipe"("householdId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "MealLog_householdId_idx" ON "MealLog"("householdId");

-- CreateIndex
CREATE INDEX "ShoppingListItem_householdId_idx" ON "ShoppingListItem"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingListItem_householdId_foodEntityId_key" ON "ShoppingListItem"("householdId", "foodEntityId");
