/* Seed: curated Indian-staple FoodEntities + a couple of curated recipes,
   and a default household. Run with `npm run db:seed`. */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedEntity {
  name: string;
  category: string;
  baseUnit: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fibrePer100: number;
  densityGPerMl?: number;
  shelfLifeDays?: number;
  reorderThreshold?: number;
}

// Approx nutrition per 100 g/ml (IFCT/USDA-style typical values).
const ENTITIES: SeedEntity[] = [
  { name: 'Basmati Rice', category: 'grain', baseUnit: 'g', caloriesPer100: 345, proteinPer100: 7.1, carbsPer100: 78, fatPer100: 0.7, fibrePer100: 1.3, shelfLifeDays: 365, reorderThreshold: 500 },
  { name: 'Toor Dal', category: 'protein', baseUnit: 'g', caloriesPer100: 343, proteinPer100: 22, carbsPer100: 57, fatPer100: 1.5, fibrePer100: 15, shelfLifeDays: 365, reorderThreshold: 250 },
  { name: 'Moong Dal', category: 'protein', baseUnit: 'g', caloriesPer100: 347, proteinPer100: 24, carbsPer100: 59, fatPer100: 1.2, fibrePer100: 16, shelfLifeDays: 365, reorderThreshold: 250 },
  { name: 'Wheat Flour', category: 'grain', baseUnit: 'g', caloriesPer100: 341, proteinPer100: 12, carbsPer100: 69, fatPer100: 1.7, fibrePer100: 11, shelfLifeDays: 180, reorderThreshold: 500 },
  { name: 'Paneer', category: 'dairy', baseUnit: 'g', caloriesPer100: 265, proteinPer100: 18, carbsPer100: 1.2, fatPer100: 21, fibrePer100: 0, shelfLifeDays: 7, reorderThreshold: 100 },
  { name: 'Amul Milk', category: 'dairy', baseUnit: 'ml', caloriesPer100: 62, proteinPer100: 3.2, carbsPer100: 4.7, fatPer100: 3.5, fibrePer100: 0, densityGPerMl: 1.03, shelfLifeDays: 3, reorderThreshold: 500 },
  { name: 'Curd', category: 'dairy', baseUnit: 'g', caloriesPer100: 60, proteinPer100: 3.1, carbsPer100: 4.7, fatPer100: 3.3, fibrePer100: 0, shelfLifeDays: 5, reorderThreshold: 200 },
  { name: 'Eggs', category: 'protein', baseUnit: 'pcs', caloriesPer100: 78, proteinPer100: 6.3, carbsPer100: 0.6, fatPer100: 5.3, fibrePer100: 0, shelfLifeDays: 21, reorderThreshold: 4 },
  { name: 'Chicken Breast', category: 'protein', baseUnit: 'g', caloriesPer100: 165, proteinPer100: 31, carbsPer100: 0, fatPer100: 3.6, fibrePer100: 0, shelfLifeDays: 3, reorderThreshold: 250 },
  { name: 'Onion', category: 'vegetable', baseUnit: 'g', caloriesPer100: 40, proteinPer100: 1.1, carbsPer100: 9.3, fatPer100: 0.1, fibrePer100: 1.7, shelfLifeDays: 30, reorderThreshold: 250 },
  { name: 'Tomato', category: 'vegetable', baseUnit: 'g', caloriesPer100: 18, proteinPer100: 0.9, carbsPer100: 3.9, fatPer100: 0.2, fibrePer100: 1.2, shelfLifeDays: 10, reorderThreshold: 250 },
  { name: 'Potato', category: 'vegetable', baseUnit: 'g', caloriesPer100: 77, proteinPer100: 2, carbsPer100: 17, fatPer100: 0.1, fibrePer100: 2.2, shelfLifeDays: 30, reorderThreshold: 500 },
  { name: 'Spinach', category: 'vegetable', baseUnit: 'g', caloriesPer100: 23, proteinPer100: 2.9, carbsPer100: 3.6, fatPer100: 0.4, fibrePer100: 2.2, shelfLifeDays: 4, reorderThreshold: 100 },
  { name: 'Cooking Oil', category: 'other', baseUnit: 'ml', caloriesPer100: 884, proteinPer100: 0, carbsPer100: 0, fatPer100: 100, fibrePer100: 0, densityGPerMl: 0.92, shelfLifeDays: 365, reorderThreshold: 250 },
  { name: 'Salt', category: 'spice', baseUnit: 'g', caloriesPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0, fibrePer100: 0, shelfLifeDays: 3650, reorderThreshold: 100 },
  { name: 'Turmeric Powder', category: 'spice', baseUnit: 'g', caloriesPer100: 354, proteinPer100: 8, carbsPer100: 65, fatPer100: 10, fibrePer100: 21, shelfLifeDays: 730, reorderThreshold: 50 },
  { name: 'Cumin Seeds', category: 'spice', baseUnit: 'g', caloriesPer100: 375, proteinPer100: 18, carbsPer100: 44, fatPer100: 22, fibrePer100: 11, shelfLifeDays: 730, reorderThreshold: 50 },
];

interface SeedRecipe {
  name: string;
  servings: number;
  ingredients: { name: string; quantity: number; unit: string }[];
}

const RECIPES: SeedRecipe[] = [
  {
    name: 'Dal Tadka',
    servings: 4,
    ingredients: [
      { name: 'Toor Dal', quantity: 200, unit: 'g' },
      { name: 'Onion', quantity: 100, unit: 'g' },
      { name: 'Tomato', quantity: 100, unit: 'g' },
      { name: 'Cooking Oil', quantity: 20, unit: 'ml' },
      { name: 'Cumin Seeds', quantity: 5, unit: 'g' },
      { name: 'Turmeric Powder', quantity: 3, unit: 'g' },
      { name: 'Salt', quantity: 5, unit: 'g' },
    ],
  },
  {
    name: 'Paneer Bhurji',
    servings: 2,
    ingredients: [
      { name: 'Paneer', quantity: 200, unit: 'g' },
      { name: 'Onion', quantity: 80, unit: 'g' },
      { name: 'Tomato', quantity: 80, unit: 'g' },
      { name: 'Cooking Oil', quantity: 15, unit: 'ml' },
      { name: 'Turmeric Powder', quantity: 2, unit: 'g' },
      { name: 'Salt', quantity: 4, unit: 'g' },
    ],
  },
  {
    name: 'Veg Khichdi',
    servings: 3,
    ingredients: [
      { name: 'Basmati Rice', quantity: 150, unit: 'g' },
      { name: 'Moong Dal', quantity: 100, unit: 'g' },
      { name: 'Potato', quantity: 100, unit: 'g' },
      { name: 'Cooking Oil', quantity: 15, unit: 'ml' },
      { name: 'Cumin Seeds', quantity: 4, unit: 'g' },
      { name: 'Turmeric Powder', quantity: 2, unit: 'g' },
      { name: 'Salt', quantity: 5, unit: 'g' },
    ],
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const isProductionPostgres = process.env.NODE_ENV === 'production' && databaseUrl.startsWith('postgres');

  if (process.env.NODE_ENV === 'production' && !isProductionPostgres) {
    console.log('Skipping seed in production because DATABASE_URL is not a Postgres connection string.');
    return;
  }
  // Household
  const household = (await prisma.household.findFirst()) ??
    (await prisma.household.create({
      data: { name: 'My Household', size: 2, goal: 'protein', diet: 'veg', proteinTargetG: 70, calorieTarget: 2000 },
    }));

  // Food entities
  const entityMap = new Map<string, string>();
  for (const e of ENTITIES) {
    const entity = await prisma.foodEntity.upsert({
      where: { name: e.name },
      update: {},
      create: e,
    });
    entityMap.set(e.name, entity.id);
  }

  // Recipes (skip if already present)
  for (const r of RECIPES) {
    const existing = await prisma.recipe.findFirst({ where: { name: r.name, householdId: null } });
    if (existing) continue;
    await prisma.recipe.create({
      data: {
        name: r.name,
        servings: r.servings,
        source: 'curated',
        householdId: null,
        ingredients: {
          create: r.ingredients
            .filter((i) => entityMap.has(i.name))
            .map((i) => ({ foodEntityId: entityMap.get(i.name)!, quantity: i.quantity, unit: i.unit })),
        },
      },
    });
  }

  // A little starter inventory so the UI isn't empty.
  const starter: { name: string; qty: number }[] = [
    { name: 'Basmati Rice', qty: 1000 },
    { name: 'Toor Dal', qty: 400 },
    { name: 'Onion', qty: 500 },
    { name: 'Tomato', qty: 300 },
    { name: 'Cooking Oil', qty: 500 },
    { name: 'Salt', qty: 500 },
    { name: 'Turmeric Powder', qty: 100 },
    { name: 'Cumin Seeds', qty: 100 },
  ];
  for (const s of starter) {
    const foodEntityId = entityMap.get(s.name);
    if (!foodEntityId) continue;
    await prisma.inventoryItem.upsert({
      where: { householdId_foodEntityId: { householdId: household.id, foodEntityId } },
      update: {},
      create: { householdId: household.id, foodEntityId, quantity: s.qty, unit: 'g' },
    });
  }

  console.log('Seed complete:', ENTITIES.length, 'entities,', RECIPES.length, 'recipes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
