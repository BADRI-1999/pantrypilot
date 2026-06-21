import OpenAI from 'openai';
import { env } from '../env.js';

let client: OpenAI | null = null;

/**
 * Lazily creates the OpenAI client. Returns null when no key is configured so
 * agents can gracefully fall back to heuristic parsing during local dev.
 */
export function getOpenAI(): OpenAI | null {
  if (!env.hasOpenAI) return null;
  if (!client) client = new OpenAI({ apiKey: env.openaiApiKey });
  return client;
}

/**
 * Calls a model expecting strict JSON back and parses it. Throws on bad JSON.
 */
export async function jsonCompletion<T>(opts: {
  model: string;
  system: string;
  user: OpenAI.Chat.Completions.ChatCompletionContentPart[] | string;
}): Promise<T> {
  const openai = getOpenAI();
  if (!openai) throw new Error('OpenAI not configured');

  const userContent =
    typeof opts.user === 'string'
      ? opts.user
      : opts.user;

  const response = await openai.chat.completions.create({
    model: opts.model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: userContent as any },
    ],
    temperature: 0.1,
  });

  const text = response.choices[0]?.message?.content ?? '{}';
  return JSON.parse(text) as T;
}
