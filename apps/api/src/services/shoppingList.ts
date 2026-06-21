import { prisma } from '../db.js';
import { round } from '../utils.js';

/**
 * Shopping List agent (PRD §11.1, FR-S1/FR-S2): rebuilds suggestions from items
 * that are below their reorder threshold, fully out, or expiring soon.
 * Velocity (run-out prediction) uses recent outflow ledger history.
 */
export async function rebuildShoppingList(householdId: string): Promise<void> {
  const items = await prisma.inventoryItem.findMany({
    where: { householdId },
    include: { foodEntity: true },
  });

  const soon = new Date();
  soon.setDate(soon.getDate() + 3);

  for (const item of items) {
    const threshold = item.foodEntity.reorderThreshold;
    let reason: string | null = null;

    if (item.quantity <= 0) reason = 'out';
    else if (threshold > 0 && item.quantity <= threshold) reason = 'low';
    else if (item.expiryDate && item.expiryDate <= soon) reason = 'expiring';

    if (!reason) {
      // Clear any stale auto-suggestion that no longer applies.
      await prisma.shoppingListItem.deleteMany({
        where: { householdId, foodEntityId: item.foodEntityId, status: 'suggested' },
      });
      continue;
    }

    const suggestedQty = round(Math.max(threshold * 2, threshold, 1) - item.quantity);

    await prisma.shoppingListItem.upsert({
      where: { householdId_foodEntityId: { householdId, foodEntityId: item.foodEntityId } },
      update: { reason, suggestedQty: Math.max(suggestedQty, threshold || 1), unit: item.unit },
      create: {
        householdId,
        foodEntityId: item.foodEntityId,
        suggestedQty: Math.max(suggestedQty, threshold || 1),
        unit: item.unit,
        reason,
        status: 'suggested',
      },
    });
  }
}

/** Estimate days-to-runout from average daily outflow over the last 14 days. */
export async function estimateRunoutDays(householdId: string, foodEntityId: string): Promise<number | null> {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const outflows = await prisma.ledgerEntry.findMany({
    where: { householdId, foodEntityId, type: 'outflow', createdAt: { gte: since } },
  });
  if (outflows.length === 0) return null;
  const totalUsed = outflows.reduce((s, e) => s + Math.abs(e.delta), 0);
  const perDay = totalUsed / 14;
  if (perDay <= 0) return null;
  const item = await prisma.inventoryItem.findUnique({
    where: { householdId_foodEntityId: { householdId, foodEntityId } },
  });
  if (!item) return null;
  return round(item.quantity / perDay, 1);
}
