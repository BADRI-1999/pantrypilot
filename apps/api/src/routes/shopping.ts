import { Router } from 'express';
import { z } from 'zod';
import { prisma, getDefaultHousehold } from '../db.js';
import { rebuildShoppingList } from '../services/shoppingList.js';
import { asyncHandler } from '../asyncHandler.js';

export const shoppingRouter = Router();

/** Current shopping list (auto + manual), newest first. */
shoppingRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const household = await getDefaultHousehold();
    await rebuildShoppingList(household.id);
    const items = await prisma.shoppingListItem.findMany({
      where: { householdId: household.id, status: { not: 'purchased' } },
      include: { foodEntity: true },
      orderBy: [{ reason: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(items);
  }),
);

const addSchema = z.object({
  foodEntityId: z.string(),
  suggestedQty: z.number().positive().default(1),
  unit: z.string().default('g'),
});

/** Manually add a staple to the list (FR-S3). */
shoppingRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const household = await getDefaultHousehold();
    const body = addSchema.parse(req.body);
    const item = await prisma.shoppingListItem.upsert({
      where: { householdId_foodEntityId: { householdId: household.id, foodEntityId: body.foodEntityId } },
      update: { suggestedQty: body.suggestedQty, unit: body.unit, reason: 'manual', status: 'suggested' },
      create: { householdId: household.id, ...body, reason: 'manual', status: 'suggested' },
      include: { foodEntity: true },
    });
    res.status(201).json(item);
  }),
);

/** Update status: accepted | dismissed | purchased. */
shoppingRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status?: string };
    const item = await prisma.shoppingListItem.update({
      where: { id: req.params.id },
      data: { status },
      include: { foodEntity: true },
    });
    res.json(item);
  }),
);

shoppingRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.shoppingListItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);
