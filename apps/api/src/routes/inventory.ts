import { Router } from 'express';
import { z } from 'zod';
import { prisma, getDefaultHousehold } from '../db.js';
import { applyLedger, reconcile } from '../services/inventory.js';
import { rebuildShoppingList, estimateRunoutDays } from '../services/shoppingList.js';
import { asyncHandler } from '../asyncHandler.js';

export const inventoryRouter = Router();

/** Current pantry balances with food entity details and run-out estimates. */
inventoryRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const household = await getDefaultHousehold();
    const items = await prisma.inventoryItem.findMany({
      where: { householdId: household.id },
      include: { foodEntity: true },
      orderBy: { updatedAt: 'desc' },
    });

    const withRunout = await Promise.all(
      items.map(async (item) => ({
        ...item,
        runoutDays: await estimateRunoutDays(household.id, item.foodEntityId),
      })),
    );
    res.json(withRunout);
  }),
);

/** Full ledger history (audit trail / "why is my rice low?"). */
inventoryRouter.get(
  '/ledger',
  asyncHandler(async (req, res) => {
    const household = await getDefaultHousehold();
    const { foodEntityId } = req.query as { foodEntityId?: string };
    const entries = await prisma.ledgerEntry.findMany({
      where: { householdId: household.id, ...(foodEntityId ? { foodEntityId } : {}) },
      include: { foodEntity: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(entries);
  }),
);

const adjustSchema = z.object({
  foodEntityId: z.string(),
  delta: z.number(),
  unit: z.string().default('g'),
  note: z.string().optional(),
});

/** Manual inflow/outflow adjustment. */
inventoryRouter.post(
  '/adjust',
  asyncHandler(async (req, res) => {
    const household = await getDefaultHousehold();
    const body = adjustSchema.parse(req.body);
    await applyLedger({
      householdId: household.id,
      foodEntityId: body.foodEntityId,
      delta: body.delta,
      unit: body.unit,
      source: 'manual',
      note: body.note,
    });
    await rebuildShoppingList(household.id);
    res.json({ ok: true });
  }),
);

const reconcileSchema = z.object({
  foodEntityId: z.string(),
  newQuantity: z.number().min(0),
  unit: z.string().default('g'),
});

/** Reconciliation pantry-check (FR-I4). */
inventoryRouter.post(
  '/reconcile',
  asyncHandler(async (req, res) => {
    const household = await getDefaultHousehold();
    const body = reconcileSchema.parse(req.body);
    await reconcile({ householdId: household.id, ...body });
    await rebuildShoppingList(household.id);
    res.json({ ok: true });
  }),
);
