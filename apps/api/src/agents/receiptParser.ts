import fs from 'node:fs';
import { env } from '../env.js';
import { getOpenAI } from '../openai/client.js';

export interface ParsedLine {
  rawText: string;
  normalizedName: string;
  quantity: number;
  unit: string; // kg | g | l | ml | pcs
  price?: number;
}

export interface ParsedReceipt {
  merchant?: string;
  purchasedAt?: string; // ISO date
  rawText: string;
  lines: ParsedLine[];
}

const SYSTEM = `You are a receipt-parsing agent for an Indian grocery app.
Read the receipt image and extract every grocery line item.
For each item: expand cryptic abbreviations into a clean human name
(e.g. "AMUL TST BTR 500G" -> "Amul Toast Butter"), and pull out the
purchased quantity, unit, and price if present.
Return STRICT JSON of shape:
{
  "merchant": string|null,
  "purchasedAt": string|null (ISO date),
  "lines": [
    { "rawText": string, "normalizedName": string,
      "quantity": number, "unit": "kg"|"g"|"l"|"ml"|"pcs", "price": number|null }
  ]
}
Ignore totals, taxes, discounts, and non-grocery lines. Use grams/ml for weights
where obvious, else "pcs". Quantity defaults to 1 if unclear.`;

/**
 * Receipt Parser agent (PRD §11.1). Uses GPT-4o vision when configured,
 * otherwise falls back to a naive line heuristic so the loop still runs offline.
 */
export async function parseReceiptImage(imagePath: string): Promise<ParsedReceipt> {
  const openai = getOpenAI();
  if (!openai) return heuristicFallback(imagePath);

  const base64 = fs.readFileSync(imagePath).toString('base64');
  const mime = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const response = await openai.chat.completions.create({
    model: env.openaiVisionModel,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Parse this receipt into JSON.' },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(text) as Partial<ParsedReceipt> & { lines?: ParsedLine[] };

  return {
    merchant: parsed.merchant ?? undefined,
    purchasedAt: parsed.purchasedAt ?? undefined,
    rawText: text,
    lines: (parsed.lines ?? []).map((l) => ({
      rawText: l.rawText ?? l.normalizedName ?? '',
      normalizedName: l.normalizedName ?? l.rawText ?? '',
      quantity: Number(l.quantity) || 1,
      unit: (l.unit ?? 'pcs').toLowerCase(),
      price: l.price ?? undefined,
    })),
  };
}

/**
 * Parses pre-extracted receipt text (e.g. emailed invoice body) without vision.
 */
export async function parseReceiptText(rawText: string): Promise<ParsedReceipt> {
  const openai = getOpenAI();
  if (!openai) return { rawText, lines: heuristicLines(rawText) };

  const response = await openai.chat.completions.create({
    model: env.openaiTextModel,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Receipt text:\n${rawText}` },
    ],
  });
  const text = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(text) as Partial<ParsedReceipt> & { lines?: ParsedLine[] };
  return {
    merchant: parsed.merchant ?? undefined,
    purchasedAt: parsed.purchasedAt ?? undefined,
    rawText,
    lines: (parsed.lines ?? []).map((l) => ({
      rawText: l.rawText ?? l.normalizedName ?? '',
      normalizedName: l.normalizedName ?? l.rawText ?? '',
      quantity: Number(l.quantity) || 1,
      unit: (l.unit ?? 'pcs').toLowerCase(),
      price: l.price ?? undefined,
    })),
  };
}

function heuristicFallback(imagePath: string): ParsedReceipt {
  return {
    rawText: `[no-OpenAI] uploaded ${imagePath}`,
    lines: [],
  };
}

/** Very rough text-line splitter used only when OpenAI is unavailable. */
function heuristicLines(rawText: string): ParsedLine[] {
  return rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const qtyMatch = line.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|l|ml|pcs|pc)?/i);
      const quantity = qtyMatch ? Number(qtyMatch[1]) : 1;
      const unit = (qtyMatch?.[2] ?? 'pcs').toLowerCase();
      const name = line.replace(/\d+(?:\.\d+)?\s*(kg|g|gm|l|ml|pcs|pc)?/gi, '').trim();
      return { rawText: line, normalizedName: name || line, quantity, unit };
    });
}
