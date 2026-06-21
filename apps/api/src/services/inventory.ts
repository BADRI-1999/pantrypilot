import { prisma } from '../db.js';
import { round } from '../utils.js';

export interface LedgerOp {
  householdId: string;
  foodEntityId: string;
  delta: number; // +inflow / -outflow, in base units
  unit: string;
  source: 'receipt' | 'meal' | 'manual' | 'reconcile';
  sourceId?: string;
  idempotencyKey?: string;
  note?: string;
  expiryDate?: Date | null;
}

/**
 * Inventory agent (PRD §11.1): applies an inflow/outflow as a ledger entry and
 * updates the running balance atomically. Idempotency key prevents double-count
 * on retried receipts/meals (PRD §11.2).
 */
export async function applyLedger(op: LedgerOp): Promise<void> {
  if (op.idempotencyKey) {
    const existing = await prisma.ledgerEntry.findUnique({
      where: { idempotencyKey: op.idempotencyKey },
    });
    if (existing) return; // already applied
  }

  const type = op.delta >= 0 ? (op.source === 'reconcile' ? 'reconcile' : 'inflow') : 'outflow';

  await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.create({
      data: {
        householdId: op.householdId,
        foodEntityId: op.foodEntityId,
        type,
        delta: round(op.delta),
        unit: op.unit,
        source: op.source,
        sourceId: op.sourceId,
        idempotencyKey: op.idempotencyKey,
        note: op.note,
      },
    });

    const item = await tx.inventoryItem.findUnique({
      where: { householdId_foodEntityId: { householdId: op.householdId, foodEntityId: op.foodEntityId } },
    });

    if (item) {
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: round(Math.max(0, item.quantity + op.delta)),
          expiryDate: op.expiryDate ?? item.expiryDate,
        },
      });
    } else {
      await tx.inventoryItem.create({
        data: {
          householdId: op.householdId,
          foodEntityId: op.foodEntityId,
          quantity: round(Math.max(0, op.delta)),
          unit: op.unit,
          expiryDate: op.expiryDate ?? null,
        },
      });
    }
  });
}

/** Reconciliation (FR-I4): set an item to an estimated absolute quantity. */
export async function reconcile(opts: {
  householdId: string;
  foodEntityId: string;
  newQuantity: number;
  unit: string;
}): Promise<void> {
  const item = await prisma.inventoryItem.findUnique({
    where: { householdId_foodEntityId: { householdId: opts.householdId, foodEntityId: opts.foodEntityId } },
  });
  const current = item?.quantity ?? 0;
  await applyLedger({
    householdId: opts.householdId,
    foodEntityId: opts.foodEntityId,
    delta: round(opts.newQuantity - current),
    unit: opts.unit,
    source: 'reconcile',
    note: 'pantry check',
  });
}
