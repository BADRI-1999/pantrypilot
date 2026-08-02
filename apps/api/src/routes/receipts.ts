import { Router } from 'express';
import { prisma, getDefaultHousehold } from '../db.js';
import { upload } from '../upload.js';
import { parseReceiptImage, parseReceiptText } from '../agents/receiptParser.js';
import { resolveItem } from '../agents/itemResolver.js';
import { toBaseUnit } from '../utils.js';
import { applyLedger } from '../services/inventory.js';
import { rebuildShoppingList } from '../services/shoppingList.js';
import { asyncHandler } from '../asyncHandler.js';

export const receiptsRouter = Router();

/** List receipts with their line items. */
receiptsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const household = await getDefaultHousehold();
    const receipts = await prisma.receipt.findMany({
      where: { householdId: household.id },
      orderBy: { createdAt: 'desc' },
      include: { lineItems: { include: { foodEntity: true } } },
    });
    res.json(receipts);
  }),
);

receiptsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: { lineItems: { include: { foodEntity: true } } },
    });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
  }),
);

/**
 * Upload a receipt image, parse it (Receipt Parser agent), resolve each line to
 * a FoodEntity (Item Resolver agent), and stage line items for review (FR-R4).
 */
receiptsRouter.post(
  '/upload',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const household = await getDefaultHousehold();
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const receipt = await prisma.receipt.create({
      data: { householdId: household.id, imagePath: req.file.filename, status: 'pending' },
    });

    const parsed = await parseReceiptImage(req.file.path);
    await stageParsedLines(receipt.id, parsed);

    const full = await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        merchant: parsed.merchant,
        purchasedAt: parsed.purchasedAt ? new Date(parsed.purchasedAt) : undefined,
        rawText: parsed.rawText,
        status: 'review',
      },
      include: { lineItems: { include: { foodEntity: true } } },
    });
    res.status(201).json(full);
  }),
);

/** Import a receipt from pasted text (e.g. emailed invoice). */
receiptsRouter.post(
  '/import-text',
  asyncHandler(async (req, res) => {
    const household = await getDefaultHousehold();
    const { text } = req.body as { text?: string };
    if (!text) return res.status(400).json({ error: 'text is required' });

    const receipt = await prisma.receipt.create({
      data: { householdId: household.id, status: 'pending', rawText: text },
    });
    const parsed = await parseReceiptText(text);
    await stageParsedLines(receipt.id, parsed);

    const full = await prisma.receipt.update({
      where: { id: receipt.id },
      data: { merchant: parsed.merchant, status: 'review' },
      include: { lineItems: { include: { foodEntity: true } } },
    });
    res.status(201).json(full);
  }),
);

/** Update a single line item during review (fix name/qty/unit/entity/status). */
receiptsRouter.patch(
  '/line/:lineId',
  asyncHandler(async (req, res) => {
    const { normalizedName, quantity, unit, foodEntityId, status } = req.body;
    const updated = await prisma.receiptLineItem.update({
      where: { id: req.params.lineId },
      data: { normalizedName, quantity, unit, foodEntityId, status },
      include: { foodEntity: true },
    });
    res.json(updated);
  }),
);

/**
 * Commit a reviewed receipt: each confirmed line becomes an inflow on the ledger
 * (FR-I2). Idempotency keyed per line so re-commit never double-counts.
 */
receiptsRouter.post(
  '/:id/commit',
  asyncHandler(async (req, res) => {
    const household = await getDefaultHousehold();
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: { lineItems: { include: { foodEntity: true } } },
    });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

    for (const line of receipt.lineItems) {
      if (line.status === 'rejected' || !line.foodEntityId || !line.foodEntity) continue;
      const { quantity, unit } = toBaseUnit(
        line.quantity,
        line.unit,
        line.foodEntity.baseUnit,
        line.foodEntity.densityGPerMl,
      );
      const expiryDate = line.foodEntity.shelfLifeDays
        ? new Date(Date.now() + line.foodEntity.shelfLifeDays * 86400000)
        : null;
      await applyLedger({
        householdId: household.id,
        foodEntityId: line.foodEntityId,
        delta: quantity,
        unit,
        source: 'receipt',
        sourceId: receipt.id,
        idempotencyKey: `receipt:${line.id}`,
        expiryDate,
      });
    }

    await prisma.receipt.update({ where: { id: receipt.id }, data: { status: 'committed' } });
    await rebuildShoppingList(household.id);
    res.json({ ok: true });
  }),
);

async function stageParsedLines(
  receiptId: string,
  parsed: Awaited<ReturnType<typeof parseReceiptImage>>,
) {
  for (const line of parsed.lines) {
    const resolved = await resolveItem(line.normalizedName || line.rawText);
    await prisma.receiptLineItem.create({
      data: {
        receiptId,
        rawText: line.rawText,
        normalizedName: line.normalizedName || line.rawText,
        quantity: line.quantity,
        unit: line.unit,
        price: line.price,
        foodEntityId: resolved?.foodEntity.id,
        confidence: resolved?.confidence ?? 0,
        status: (resolved?.confidence ?? 0) >= 0.9 ? 'confirmed' : 'pending',
      },
    });
  }
}
