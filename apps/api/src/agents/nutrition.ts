import type { FoodEntity } from '@prisma/client';
import { round } from '../utils.js';

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

export interface IngredientAmount {
  foodEntity: FoodEntity;
  quantity: number; // in foodEntity.baseUnit
}

const EMPTY: NutritionTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };

/**
 * Nutrition agent (PRD §11.1, FR-N1): compute totals from resolved ingredient
 * amounts. Nutrition is stored per 100 base units on each FoodEntity.
 */
export function computeNutrition(ingredients: IngredientAmount[]): NutritionTotals {
  const totals = ingredients.reduce<NutritionTotals>((acc, { foodEntity, quantity }) => {
    const factor = quantity / 100;
    acc.calories += foodEntity.caloriesPer100 * factor;
    acc.protein += foodEntity.proteinPer100 * factor;
    acc.carbs += foodEntity.carbsPer100 * factor;
    acc.fat += foodEntity.fatPer100 * factor;
    acc.fibre += foodEntity.fibrePer100 * factor;
    return acc;
  }, { ...EMPTY });

  return {
    calories: round(totals.calories),
    protein: round(totals.protein),
    carbs: round(totals.carbs),
    fat: round(totals.fat),
    fibre: round(totals.fibre),
  };
}

/** Generate non-medical, healthy-framed insights against household goals (FR-N3). */
export function buildInsights(opts: {
  weekProtein: number;
  weekCalories: number;
  weekFibre: number;
  proteinTargetG: number;
  calorieTarget: number;
  daysTracked: number;
}): string[] {
  const insights: string[] = [];
  const days = Math.max(1, opts.daysTracked);
  const avgProtein = opts.weekProtein / days;
  const avgFibre = opts.weekFibre / days;

  if (avgProtein < opts.proteinTargetG * 0.8) {
    insights.push(
      `Protein is averaging ${Math.round(avgProtein)} g/day vs your ${opts.proteinTargetG} g goal — consider dal, paneer, eggs or curd.`,
    );
  } else {
    insights.push(`Protein is on track (~${Math.round(avgProtein)} g/day). Nice.`);
  }

  if (avgFibre < 25) {
    insights.push(`Fibre looks low (~${Math.round(avgFibre)} g/day) — add more whole grains, dal and vegetables.`);
  }

  insights.push('General wellness guidance, not medical advice.');
  return insights;
}
