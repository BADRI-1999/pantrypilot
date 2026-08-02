import { Router } from 'express';
import { z } from 'zod';
import { prisma, getDefaultHousehold } from '../db.js';
import { buildInsights } from '../agents/nutrition.js';
import { asyncHandler } from '../asyncHandler.js';

export const householdRouter = Router();

/** Get the household profile (goals, diet, targets). */
householdRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const household = await getDefaultHousehold();
    res.json(household);
  }),
);

const updateSchema = z.object({
  name: z.string().optional(),
  size: z.number().int().positive().optional(),
  goal: z.enum(['maintain', 'protein', 'lose', 'gain', 'pantry']).optional(),
  diet: z.enum(['veg', 'nonveg', 'egg', 'jain']).optional(),
  allergies: z.string().optional(),
  proteinTargetG: z.number().int().positive().optional(),
  calorieTarget: z.number().int().positive().optional(),
});

householdRouter.patch(
  '/',
  asyncHandler(async (req, res) => {
    const household = await getDefaultHousehold();
    const body = updateSchema.parse(req.body);
    const updated = await prisma.household.update({ where: { id: household.id }, data: body });
    res.json(updated);
  }),
);

/**
 * Nutrition dashboard (FR-N1/N4): today's totals, 7-day trend, and insights
 * framed as wellness guidance (not medical advice).
 */
householdRouter.get(
  '/nutrition',
  asyncHandler(async (_req, res) => {
  const household = await getDefaultHousehold();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [todayMeals, weekMeals] = await Promise.all([
    prisma.mealLog.findMany({ where: { householdId: household.id, loggedAt: { gte: startOfToday } } }),
    prisma.mealLog.findMany({ where: { householdId: household.id, loggedAt: { gte: weekAgo } } }),
  ]);

  const sum = (rows: typeof weekMeals) =>
    rows.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
        fibre: acc.fibre + m.fibre,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
    );

  const today = sum(todayMeals);
  const week = sum(weekMeals);

  // Daily breakdown for the trend chart.
  const byDay = new Map<string, { calories: number; protein: number }>();
  for (const m of weekMeals) {
    const key = m.loggedAt.toISOString().slice(0, 10);
    const prev = byDay.get(key) ?? { calories: 0, protein: 0 };
    byDay.set(key, { calories: prev.calories + m.calories, protein: prev.protein + m.protein });
  }
  const trend = [...byDay.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const insights = buildInsights({
    weekProtein: week.protein,
    weekCalories: week.calories,
    weekFibre: week.fibre,
    proteinTargetG: household.proteinTargetG,
    calorieTarget: household.calorieTarget,
    daysTracked: Math.max(1, byDay.size),
  });

  res.json({
    targets: { protein: household.proteinTargetG, calories: household.calorieTarget },
    today,
    week,
    trend,
    insights,
    mealsThisWeek: weekMeals.length,
  });
  }),
);
