import { Router } from 'express';
import { z } from 'zod';
import { prisma, getDefaultHousehold } from '../db.js';
import { upload } from '../upload.js';
import { recognizeDish } from '../agents/dishVision.js';
import { computeNutrition, type IngredientAmount } from '../agents/nutrition.js';
import { resolveItem } from '../agents/itemResolver.js';
import { applyLedger } from '../services/inventory.js';
import { rebuildShoppingList } from '../services/shoppingList.js';
import { round } from '../utils.js';

export const mealsRouter = Router();

/** List logged meals. */
mealsRouter.get('/', async (_req, res) => {
  const household = await getDefaultHousehold();
  const meals = await prisma.mealLog.findMany({
    where: { householdId: household.id },
    include: { recipe: true },
    orderBy: { loggedAt: 'desc' },
    take: 100,
  });
  res.json(meals);
});

/**
 * Assistive dish recognition from a photo (FR-M2). Returns a dish + servings +
 * decomposed ingredients with confidence. Deducts NOTHING — confirm-before-deduct.
 */
mealsRouter.post('/suggest', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const suggestion = await recognizeDish(req.file.path);
    if (!suggestion) {
      return res.json({
        imagePath: req.file.filename,
        suggestion: null,
        message: 'Vision model unavailable — log this meal by recipe or manually.',
      });
    }
    // Resolve each suggested ingredient to a FoodEntity so the UI can show macros.
    const resolved = await Promise.all(
      suggestion.ingredients.map(async (ing) => {
        const r = await resolveItem(ing.name);
        return {
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          foodEntityId: r?.foodEntity.id ?? null,
        };
      }),
    );
    res.json({ imagePath: req.file.filename, suggestion: { ...suggestion, ingredients: resolved } });
  } catch (err) {
    next(err);
  }
});

const manualIngredient = z.object({
  foodEntityId: z.string(),
  quantity: z.number().positive(), // base units
});

const logSchema = z
  .object({
    name: z.string().optional(),
    servings: z.number().positive().default(1),
    eaters: z.number().int().positive().default(1),
    imagePath: z.string().optional(),
    recipeId: z.string().optional(),
    ingredients: z.array(manualIngredient).optional(),
  })
  .refine((d) => d.recipeId || (d.ingredients && d.ingredients.length > 0), {
    message: 'Provide either recipeId or ingredients',
  });

/**
 * Log a meal (FR-M1/M3): resolves the ingredient amounts, computes nutrition,
 * and deducts each ingredient from inventory as an outflow (confirm-before-deduct
 * already happened in the UI). Idempotent per meal+ingredient.
 */
mealsRouter.post('/', async (req, res, next) => {
  try {
    const household = await getDefaultHousehold();
    const body = logSchema.parse(req.body);

    let mealName = body.name ?? 'Meal';
    const amounts: IngredientAmount[] = [];

    if (body.recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: body.recipeId },
        include: { ingredients: { include: { foodEntity: true } } },
      });
      if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
      mealName = body.name ?? recipe.name;
      const scale = body.servings / recipe.servings;
      for (const ing of recipe.ingredients) {
        amounts.push({ foodEntity: ing.foodEntity, quantity: round(ing.quantity * scale) });
      }
    } else if (body.ingredients) {
      for (const ing of body.ingredients) {
        const fe = await prisma.foodEntity.findUnique({ where: { id: ing.foodEntityId } });
        if (fe) amounts.push({ foodEntity: fe, quantity: ing.quantity });
      }
    }

    const nutrition = computeNutrition(amounts);

    const meal = await prisma.mealLog.create({
      data: {
        householdId: household.id,
        recipeId: body.recipeId,
        name: mealName,
        servings: body.servings,
        eaters: body.eaters,
        imagePath: body.imagePath,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fibre: nutrition.fibre,
      },
    });

    // Deduct from inventory (outflow ledger entries).
    for (const a of amounts) {
      await applyLedger({
        householdId: household.id,
        foodEntityId: a.foodEntity.id,
        delta: -a.quantity,
        unit: a.foodEntity.baseUnit,
        source: 'meal',
        sourceId: meal.id,
        idempotencyKey: `meal:${meal.id}:${a.foodEntity.id}`,
        note: mealName,
      });
    }

    await rebuildShoppingList(household.id);
    res.status(201).json({ meal, nutrition });
  } catch (err) {
    next(err);
  }
});

mealsRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.mealLog.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
