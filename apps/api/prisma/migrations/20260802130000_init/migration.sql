-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Household',
    "size" INTEGER NOT NULL DEFAULT 1,
    "goal" TEXT NOT NULL DEFAULT 'maintain',
    "diet" TEXT NOT NULL DEFAULT 'veg',
    "allergies" TEXT NOT NULL DEFAULT '',
    "proteinTargetG" INTEGER NOT NULL DEFAULT 60,
    "calorieTarget" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "baseUnit" TEXT NOT NULL DEFAULT 'g',
    "caloriesPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proteinPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbsPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fibrePer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "densityGPerMl" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "shelfLifeDays" INTEGER,
    "reorderThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "aliases" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FoodEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "imagePath" TEXT,
    "merchant" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptLineItem" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "price" DOUBLE PRECISION,
    "foodEntityId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "ReceiptLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "foodEntityId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "location" TEXT NOT NULL DEFAULT 'pantry',
    "expiryDate" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "foodEntityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "idempotencyKey" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "householdId" TEXT,
    "name" TEXT NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'curated',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "foodEntityId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "recipeId" TEXT,
    "name" TEXT NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "eaters" INTEGER NOT NULL DEFAULT 1,
    "imagePath" TEXT,
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fibre" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingListItem" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "foodEntityId" TEXT NOT NULL,
    "suggestedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "reason" TEXT NOT NULL DEFAULT 'low',
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingListItem_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLineItem" ADD CONSTRAINT "ReceiptLineItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLineItem" ADD CONSTRAINT "ReceiptLineItem_foodEntityId_fkey" FOREIGN KEY ("foodEntityId") REFERENCES "FoodEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_foodEntityId_fkey" FOREIGN KEY ("foodEntityId") REFERENCES "FoodEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_foodEntityId_fkey" FOREIGN KEY ("foodEntityId") REFERENCES "FoodEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_foodEntityId_fkey" FOREIGN KEY ("foodEntityId") REFERENCES "FoodEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_foodEntityId_fkey" FOREIGN KEY ("foodEntityId") REFERENCES "FoodEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

