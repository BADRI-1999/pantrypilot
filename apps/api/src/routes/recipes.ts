import { Router } from 'express';
import { z } from 'zod';
import { prisma, getDefaultHousehold } from '../db.js';
import { asyncHandler } from '../asyncHandler.js';

export const recipesRouter = Router();

/** List recipes with ingredients. */
recipesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const household = await getDefaultHousehold();
    const recipes = await prisma.recipe.findMany({
      where: { OR: [{ householdId: household.id }, { householdId: null }] },
      include: { ingredients: { include: { foodEntity: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(recipes);
  }),
);

/**
 * "Cook with what I have" (FR-C1): rank recipes by how fully the current pantry
 * covers their ingredients (per the recipe's base servings).
 */
recipesRouter.get(
  '/cookable',
  asyncHandler(async (_req, res) => {
    const household = await getDefaultHousehold();
    const [recipes, inventory] = await Promise.all([
      prisma.recipe.findMany({
        where: { OR: [{ householdId: household.id }, { householdId: null }] },
        include: { ingredients: { include: { foodEntity: true } } },
      }),
      prisma.inventoryItem.findMany({ where: { householdId: household.id } }),
    ]);
    const stock = new Map(inventory.map((i) => [i.foodEntityId, i.quantity]));

    const ranked = recipes
      .map((r) => {
        const total = r.ingredients.length || 1;
        const have = r.ingredients.filter((ing) => (stock.get(ing.foodEntityId) ?? 0) >= ing.quantity).length;
        const missing = r.ingredients
          .filter((ing) => (stock.get(ing.foodEntityId) ?? 0) < ing.quantity)
          .map((ing) => ing.foodEntity.name);
        return { recipe: r, coverage: have / total, have, total, missing };
      })
      .sort((a, b) => b.coverage - a.coverage);

    res.json(ranked);
  }),
);

const ingredientSchema = z.object({
  foodEntityId: z.string(),
  quantity: z.number().positive(),
  unit: z.string().default('g'),
});

const createSchema = z.object({
  name: z.string().min(1),
  servings: z.number().int().positive().default(1),
  source: z.enum(['curated', 'user', 'llm']).default('user'),
  ingredients: z.array(ingredientSchema).min(1),
});

recipesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const household = await getDefaultHousehold();
    const body = createSchema.parse(req.body);
    const recipe = await prisma.recipe.create({
      data: {
        householdId: household.id,
        name: body.name,
        servings: body.servings,
        source: body.source,
        ingredients: { create: body.ingredients },
      },
      include: { ingredients: { include: { foodEntity: true } } },
    });
    res.status(201).json(recipe);
  }),
);

recipesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.recipe.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);
