import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { upsertEntity } from '../agents/itemResolver.js';
import { asyncHandler } from '../asyncHandler.js';

export const foodEntitiesRouter = Router();

/** List / search canonical food entities. */
foodEntitiesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = req.query as { q?: string };
    const entities = await prisma.foodEntity.findMany({
      where: q ? { name: { contains: q } } : undefined,
      orderBy: { name: 'asc' },
      take: 500,
    });
    res.json(entities);
  }),
);

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  baseUnit: z.enum(['g', 'ml', 'pcs']).optional(),
  caloriesPer100: z.number().optional(),
  proteinPer100: z.number().optional(),
  carbsPer100: z.number().optional(),
  fatPer100: z.number().optional(),
  fibrePer100: z.number().optional(),
  densityGPerMl: z.number().optional(),
  shelfLifeDays: z.number().nullable().optional(),
  reorderThreshold: z.number().optional(),
});

foodEntitiesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const entity = await upsertEntity(body);
    res.status(201).json(entity);
  }),
);

foodEntitiesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const entity = await prisma.foodEntity.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(entity);
  }),
);
