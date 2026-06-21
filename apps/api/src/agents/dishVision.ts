import fs from 'node:fs';
import { env } from '../env.js';
import { getOpenAI } from '../openai/client.js';

export interface DishSuggestion {
  dishName: string;
  servings: number;
  confidence: number;
  // Suggested ingredients (raw groceries) per the estimated servings.
  ingredients: { name: string; quantity: number; unit: string }[];
}

const SYSTEM = `You are a dish-recognition agent for an Indian nutrition app.
Look at the cooked-food photo. Identify the most likely dish, estimate how many
servings are shown, and decompose it into the raw grocery ingredients used with
rough quantities (in grams/ml/pcs) for the TOTAL shown, not per serving.
This is ASSISTIVE — the user will confirm before anything is deducted, so be
honest with the confidence score. Return STRICT JSON:
{
  "dishName": string,
  "servings": number,
  "confidence": number,           // 0..1, monocular portion estimates are unreliable
  "ingredients": [ { "name": string, "quantity": number, "unit": "g"|"ml"|"pcs" } ]
}`;

/**
 * Vision/Dish agent (PRD §11.1, §6). Always confirm-before-deduct.
 */
export async function recognizeDish(imagePath: string): Promise<DishSuggestion | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const base64 = fs.readFileSync(imagePath).toString('base64');
  const mime = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const response = await openai.chat.completions.create({
    model: env.openaiVisionModel,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identify this dish and decompose it.' },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(text) as DishSuggestion;
    return {
      dishName: parsed.dishName ?? 'Unknown dish',
      servings: Number(parsed.servings) || 1,
      confidence: Number(parsed.confidence) || 0.3,
      ingredients: (parsed.ingredients ?? []).map((i) => ({
        name: i.name,
        quantity: Number(i.quantity) || 0,
        unit: (i.unit ?? 'g').toLowerCase(),
      })),
    };
  } catch {
    return null;
  }
}
