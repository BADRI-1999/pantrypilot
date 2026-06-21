import { prisma } from '../db.js';
import { env } from '../env.js';
import { getOpenAI } from '../openai/client.js';
import { normalizeName } from '../utils.js';
import type { FoodEntity } from '@prisma/client';

export interface ResolvedItem {
  foodEntity: FoodEntity;
  confidence: number;
}

/**
 * Item Resolver agent (PRD §11.1): map a raw/normalized receipt string onto a
 * canonical FoodEntity. Strategy:
 *   1. Exact + alias normalized-string match against existing entities (high conf).
 *   2. LLM resolution that either picks an existing entity or proposes a new one
 *      with nutrition estimates (medium conf), then upserts it.
 */
export async function resolveItem(rawName: string): Promise<ResolvedItem | null> {
  const norm = normalizeName(rawName);
  if (!norm) return null;

  const entities = await prisma.foodEntity.findMany();

  // 1. Local match
  const local = matchLocally(norm, entities);
  if (local) return { foodEntity: local, confidence: 0.95 };

  // 2. LLM resolution / creation
  const openai = getOpenAI();
  if (!openai) {
    // Offline fallback: create a bare entity so the loop continues.
    const created = await upsertEntity({
      name: titleCase(norm),
      category: 'other',
      baseUnit: 'g',
    });
    return { foodEntity: created, confidence: 0.4 };
  }

  const candidates = entities.map((e) => e.name).slice(0, 200);
  const result = await llmResolve(rawName, candidates);
  if (!result) return null;

  if (result.matchName) {
    const matched = entities.find((e) => e.name.toLowerCase() === result.matchName!.toLowerCase());
    if (matched) return { foodEntity: matched, confidence: result.confidence ?? 0.8 };
  }

  const created = await upsertEntity({
    name: result.name ?? titleCase(norm),
    category: result.category ?? 'other',
    baseUnit: result.baseUnit ?? 'g',
    caloriesPer100: result.caloriesPer100,
    proteinPer100: result.proteinPer100,
    carbsPer100: result.carbsPer100,
    fatPer100: result.fatPer100,
    fibrePer100: result.fibrePer100,
    densityGPerMl: result.densityGPerMl,
    shelfLifeDays: result.shelfLifeDays,
  });
  // Learn the alias for next time (FR-R6).
  await learnAlias(created, norm);
  return { foodEntity: created, confidence: result.confidence ?? 0.7 };
}

function matchLocally(norm: string, entities: FoodEntity[]): FoodEntity | null {
  for (const e of entities) {
    if (normalizeName(e.name) === norm) return e;
    const aliases = e.aliases.split(',').map((a) => a.trim()).filter(Boolean);
    if (aliases.includes(norm)) return e;
  }
  // contains match (e.g. "amul toast butter" contains "butter")
  for (const e of entities) {
    const en = normalizeName(e.name);
    if (en && (norm.includes(en) || en.includes(norm))) return e;
  }
  return null;
}

interface LlmResolution {
  matchName?: string | null;
  name?: string;
  category?: string;
  baseUnit?: string;
  caloriesPer100?: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  fibrePer100?: number;
  densityGPerMl?: number;
  shelfLifeDays?: number;
  confidence?: number;
}

async function llmResolve(rawName: string, candidates: string[]): Promise<LlmResolution | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const system = `You resolve grocery line items to canonical food entities for an
Indian nutrition app. Given a raw item name and a list of existing canonical names,
either MATCH it to one existing name, or propose a NEW canonical food with nutrition
per 100g/ml (use IFCT/USDA typical values). Return STRICT JSON:
{
  "matchName": string|null,        // exact existing name if it matches, else null
  "name": string,                  // clean canonical name
  "category": "grain"|"dairy"|"protein"|"vegetable"|"fruit"|"spice"|"packaged"|"other",
  "baseUnit": "g"|"ml"|"pcs",
  "caloriesPer100": number, "proteinPer100": number, "carbsPer100": number,
  "fatPer100": number, "fibrePer100": number,
  "densityGPerMl": number, "shelfLifeDays": number,
  "confidence": number             // 0..1
}`;

  const response = await openai.chat.completions.create({
    model: env.openaiTextModel,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Raw item: "${rawName}"\nExisting canonical names: ${JSON.stringify(candidates)}`,
      },
    ],
  });
  const text = response.choices[0]?.message?.content ?? '{}';
  try {
    return JSON.parse(text) as LlmResolution;
  } catch {
    return null;
  }
}

export async function upsertEntity(data: {
  name: string;
  category?: string;
  baseUnit?: string;
  caloriesPer100?: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  fibrePer100?: number;
  densityGPerMl?: number;
  shelfLifeDays?: number | null;
  reorderThreshold?: number;
  barcode?: string;
}): Promise<FoodEntity> {
  return prisma.foodEntity.upsert({
    where: { name: data.name },
    update: {},
    create: {
      name: data.name,
      category: data.category ?? 'other',
      baseUnit: data.baseUnit ?? 'g',
      caloriesPer100: data.caloriesPer100 ?? 0,
      proteinPer100: data.proteinPer100 ?? 0,
      carbsPer100: data.carbsPer100 ?? 0,
      fatPer100: data.fatPer100 ?? 0,
      fibrePer100: data.fibrePer100 ?? 0,
      densityGPerMl: data.densityGPerMl ?? 1,
      shelfLifeDays: data.shelfLifeDays ?? null,
      reorderThreshold: data.reorderThreshold ?? 0,
      barcode: data.barcode,
    },
  });
}

async function learnAlias(entity: FoodEntity, norm: string): Promise<void> {
  const aliases = entity.aliases.split(',').map((a) => a.trim()).filter(Boolean);
  if (aliases.includes(norm)) return;
  aliases.push(norm);
  await prisma.foodEntity.update({
    where: { id: entity.id },
    data: { aliases: aliases.join(',') },
  });
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
